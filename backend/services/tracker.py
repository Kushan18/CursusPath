import asyncio
import httpx
import re
import random
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import google.generativeai as genai
from config.supabase_config import supabase
import chromadb

# Initialize ChromaDB locally
chroma_client = chromadb.PersistentClient(path="./chroma_db")
vector_collection = chroma_client.get_or_create_collection(name="listings_rag")

# Setup GenAI for embeddings
genai.configure()

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
]

def get_random_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

async def fetch_with_httpx_fallback(url: str) -> str:
    """Fallback strategy using raw httpx if Playwright fails."""
    try:
        async with httpx.AsyncClient(headers=get_random_headers(), follow_redirects=True) as client:
            response = await client.get(url, timeout=15.0)
            response.raise_for_status()
            return response.text
    except Exception as e:
        print(f"Fallback HTTPX failed for {url}: {e}")
        return ""

def parse_deadline(text_to_search: str, default_days: int = 30) -> str:
    """
    Attempts to extract an explicit deadline from text using simple regex.
    Defaults to `default_days` if none found.
    """
    # Look for patterns like "Aug 16, 2026" or "August 16"
    date_pattern = re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:, \d{4})?', re.IGNORECASE)
    match = date_pattern.search(text_to_search)
    
    if match:
        date_str = match.group(0)
        try:
            # If no year is provided, append the current year
            if ',' not in date_str:
                date_str += f", {datetime.now().year}"
            
            # Simple heuristic parsing (can be enhanced with dateutil)
            parsed_date = datetime.strptime(date_str.replace(',', '').strip(), '%b %d %Y')
            return parsed_date.strftime("%Y-%m-%d")
        except Exception:
            pass # Fall back to default
            
    return (datetime.now() + timedelta(days=default_days)).strftime("%Y-%m-%d")

async def scrape_yc_jobs():
    """Scrapes YCombinator jobs for Jobs and Internships."""
    url = "https://www.ycombinator.com/jobs/role/all"
    scraped_data = []
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=random.choice(USER_AGENTS),
                viewport={'width': 1920, 'height': 1080}
            )
            page = await context.new_page()
            
            await page.goto(url, timeout=30000, wait_until="networkidle")
            
            # Use Playwright native wait for specific job container elements if possible, otherwise just wait briefly
            try:
                await page.wait_for_selector('a[href*="/companies/"]', timeout=10000)
            except PlaywrightTimeoutError:
                pass 
                
            html_content = await page.content()
            await browser.close()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # YC Jobs usually have links pointing to company job pages
            job_links = soup.select('a[href*="/companies/"]')
            
            seen_urls = set()
            for link in job_links:
                href = link.get('href', '')
                if '/jobs/' not in href or href in seen_urls:
                    continue
                seen_urls.add(href)
                
                title_elem = link.find('span', class_=re.compile(r'title|name', re.I)) or link
                title_text = title_elem.get_text(strip=True) if title_elem else "YC Startup Role"
                
                if not title_text or len(title_text) < 3:
                    continue
                    
                # Deduce category
                category = "internship" if re.search(r'\b(intern|internship|co-op)\b', title_text, re.IGNORECASE) else "job"
                
                # Guess provider from URL or preceding elements
                provider_match = re.search(r'/companies/([^/]+)', href)
                provider = provider_match.group(1).replace('-', ' ').title() if provider_match else "YC Startup"
                
                scraped_data.append({
                    "title": title_text,
                    "provider": provider,
                    "description": f"Role at {provider} found via YCombinator.",
                    "apply_url": f"https://www.ycombinator.com{href}" if href.startswith('/') else href,
                    "listing_type": category,
                    "compensation_type": "paid",
                    "deadline_date": parse_deadline(title_text, default_days=30)
                })
                
    except Exception as e:
        print(f"Error scraping YC Jobs: {e}")
        
    return scraped_data

async def scrape_github_certs():
    """Scrapes evergreen certifications from a public Github repository."""
    url = "https://raw.githubusercontent.com/ArslanYM/Free-Certifications/main/README.md"
    scraped_data = []
    
    html_content = await fetch_with_httpx_fallback(url)
    if not html_content:
        return scraped_data
        
    # Parse markdown table rows
    lines = html_content.split('\n')
    
    for line in lines:
        if line.strip().startswith('|') and '---' not in line and 'Technology' not in line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 5:
                # parts[0] is empty because it starts with '|'
                title = parts[1]
                provider = parts[2]
                description = parts[3]
                link_md = parts[4]
                
                link_match = re.search(r'\]\((https?://[^\)]+)\)', link_md)
                if title and provider and link_match:
                    link = link_match.group(1).strip()
                    
                    scraped_data.append({
                        "title": title,
                        "provider": provider,
                        "description": description if description else f"Free certification offered by {provider}.",
                        "apply_url": link,
                        "listing_type": "certification",
                        "compensation_type": "free",
                        "deadline_date": parse_deadline(line, default_days=60) 
                    })
                
    return scraped_data

async def scrape_devpost_hackathons():
    """Scrapes hackathons from Devpost."""
    url = "https://devpost.com/hackathons"
    scraped_data = []
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(user_agent=random.choice(USER_AGENTS))
            page = await context.new_page()
            
            await page.goto(url, timeout=30000, wait_until="domcontentloaded")
            
            try:
                # Wait for hackathon tiles to load
                await page.wait_for_selector('a[href*=".devpost.com"]', timeout=10000)
            except:
                pass
                
            html_content = await page.content()
            await browser.close()
            
            soup = BeautifulSoup(html_content, 'html.parser')
            
            hackathon_links = soup.select('a[href*=".devpost.com"]')
            seen_urls = set()
            
            for link in hackathon_links:
                href = link.get('href', '')
                if not href.startswith('https://') or href in seen_urls or href == 'https://devpost.com':
                    continue
                seen_urls.add(href)
                
                title_elem = link.find(['h2', 'h3', 'strong'])
                title_text = title_elem.get_text(strip=True) if title_elem else link.get_text(strip=True)
                
                if not title_text or len(title_text) < 5:
                    continue
                    
                # Extract text for deadline parsing
                full_text = link.get_text(separator=' ', strip=True)
                
                scraped_data.append({
                    "title": title_text,
                    "provider": "Devpost Platform",
                    "description": "Active hackathon found on Devpost.",
                    "apply_url": href,
                    "listing_type": "hackathon",
                    "compensation_type": "free",
                    "deadline_date": parse_deadline(full_text, default_days=45)
                })
                
    except Exception as e:
        print(f"Error scraping Devpost: {e}")
        
    return scraped_data

async def process_and_index_data():
    """Runs data extraction, writes to Supabase (upsert logic), then syncs to ChromaDB."""
    print(f"[{datetime.now()}] Starting live data extraction pipeline...")
    
    # Run scrapers concurrently
    results = await asyncio.gather(
        scrape_yc_jobs(),
        scrape_github_certs(),
        scrape_devpost_hackathons(),
        return_exceptions=True
    )
    
    all_listings = []
    for res in results:
        if isinstance(res, list):
            all_listings.extend(res)
            
    print(f"Extracted {len(all_listings)} total real-world opportunities.")
            
    for item in all_listings:
        if not item.get("apply_url"):
            continue
            
        try:
            # 1. STRICT "UPSERT" DE-DUPLICATION LOGIC
            # Treat 'apply_url' as the absolute unique natural key across the database.
            # Executes upsert. If changed, OVERWRITES row. If unchanged, no duplicate is created.
            response = supabase.table("global_opportunities").upsert(
                item, on_conflict="apply_url"
            ).execute()
            
            if response.data:
                db_record = response.data[0]
                record_id = db_record["id"]
                
                # 2. Compute Embedding
                text_to_embed = f"Title: {db_record['title']} | Provider: {db_record['provider']} | Description: {db_record['description']}"
                
                embedding_res = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text_to_embed
                )
                vector = embedding_res['embedding']
                
                # 3. CHROMADB VECTOR INDEX ALIGNMENT
                # If updated, run vector_collection.upsert to keep RAG semantic search 100% synchronized
                vector_collection.upsert(
                    ids=[str(record_id)],
                    embeddings=[vector],
                    metadatas=[{
                        "listing_type": db_record["listing_type"], 
                        "provider": db_record["provider"],
                        "apply_url": db_record["apply_url"]
                    }]
                )
        except Exception as e:
            print(f"Error processing listing {item.get('apply_url')}: {e}")

async def purge_expired_opportunities():
    """
    Automated purging: DELETE FROM global_opportunities WHERE deadline_date < CURRENT_DATE.
    CRITICAL VECTOR CLEANUP: Drops deleted embeddings from ChromaDB.
    """
    try:
        print(f"[{datetime.now()}] Running auto-delete pipeline for expired opportunities...")
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # 1. Automated Supabase DB Pruning
        response = supabase.table("global_opportunities").delete().lt("deadline_date", today_str).execute()
        
        deleted_records = response.data
        if deleted_records:
            deleted_ids = [str(record["id"]) for record in deleted_records]
            
            # 2. CRITICAL VECTOR CLEANUP
            if deleted_ids:
                vector_collection.delete(ids=deleted_ids)
                print(f"Purged {len(deleted_ids)} expired opportunities from Supabase and ChromaDB.")
        else:
            print("No expired opportunities found to purge today.")
            
    except Exception as e:
        print(f"Error during expired opportunities purge: {e}")

# Scheduler Instance
scheduler = AsyncIOScheduler()

def start_scheduler():
    # Execute dynamic scraper pipeline daily at 02:00
    scheduler.add_job(process_and_index_data, 'cron', hour=2, minute=0) 
    
    # Execute database/vector purge daily at 03:00
    scheduler.add_job(purge_expired_opportunities, 'cron', hour=3, minute=0) 
    
    scheduler.start()
    print("Background tracker scheduler started: Dynamic Ingestion at 02:00, Vector Purge at 03:00.")
