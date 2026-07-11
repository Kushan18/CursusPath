import asyncio
from services.tracker import scrape_yc_jobs, scrape_github_certs, scrape_devpost_hackathons

async def run_test():
    print("Fetching from YCombinator...")
    yc_jobs = await scrape_yc_jobs()
    print(f"-> Extracted {len(yc_jobs)} items from YC.")
    
    print("\nFetching from GitHub Free Certifications...")
    certs = await scrape_github_certs()
    print(f"-> Extracted {len(certs)} items from GitHub.")
    
    print("\nFetching from Devpost...")
    hackathons = await scrape_devpost_hackathons()
    print(f"-> Extracted {len(hackathons)} items from Devpost.")
    
if __name__ == "__main__":
    asyncio.run(run_test())
