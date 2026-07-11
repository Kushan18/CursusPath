import json
import uuid
import httpx
from bs4 import BeautifulSoup
import google.generativeai as genai

async def get_dynamic_college_intel(college_name: str):
    """Uses LLM models to dynamically evaluate top company metrics and hierarchies."""
    scraped_text = ""
    is_url = False
    
    if college_name.startswith("http://") or college_name.startswith("https://") or college_name.startswith("www."):
        is_url = True
        target_url = college_name if not college_name.startswith("www.") else "https://" + college_name
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(target_url)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                scraped_text = soup.get_text(separator=' ', strip=True)
                # Limit text to avoid token limits
                scraped_text = scraped_text[:15000]
        except Exception as e:
            print(f"Error scraping {target_url}: {e}")
            scraped_text = f"Failed to scrape URL. Proceed with general knowledge for {college_name}."

    if is_url and scraped_text:
        prompt = f"""
        Analyze the following scraped text from a college placement website:
        "{scraped_text}"
        
        Identify the top 4 enterprise recruiters based on the volume of students placed or mentioned in the text. For each recruiter, provide their standard recruitment rounds, and a "placement_percentage" string (e.g., "35%", "20%") representing their historical hiring volume at this college.
        Critically: Sort the companies in descending order by placement percentage (highest volume first).
        Return ONLY raw JSON with this exact schema (do not wrap in markdown):
        {{
          "college": "Extracted College Name",
          "top_companies": [
            {{
              "name": "Company Name",
              "about": "Brief 2-3 sentence information about the company and its operations.",
              "placement_percentage": "35%",
              "timeline": [
                {{"round": 1, "name": "Round Name", "description": "Round description", "type": "mcq or coding"}}
              ]
            }}
          ]
        }}
        """
    else:
        prompt = f"""
        Search the official placement records for "{college_name}". 
        Identify the top 4 enterprise recruiters based on the volume of students placed. For each recruiter, provide their standard recruitment rounds, and a "placement_percentage" string (e.g., "35%", "20%") representing their historical hiring volume at this college.
        Critically: Sort the companies in descending order by placement percentage (highest volume first).
        Return ONLY raw JSON with this exact schema (do not wrap in markdown):
        {{
          "college": "{college_name}",
          "top_companies": [
            {{
              "name": "Company Name",
              "about": "Brief 2-3 sentence information about the company and its operations.",
              "placement_percentage": "35%",
              "timeline": [
                {{"round": 1, "name": "Round Name", "description": "Round description", "type": "mcq or coding"}}
              ]
            }}
          ]
        }}
        """
        
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(clean_json)
    except Exception as e:
        print(f"Error generating/parsing college JSON: {e}")
        # Fallback if LLM fails or hits a quota block
        return {
            "college": college_name,
            "top_companies": [
                {"name": "Capgemini", "about": "Capgemini is a global leader in partnering with companies to transform and manage their business by harnessing the power of technology.", "placement_percentage": "30%", "timeline": [{"round": 1, "name": "Aptitude", "description": "Basic Aptitude", "type": "mcq"}]},
                {"name": "TCS", "about": "Tata Consultancy Services is an IT services, consulting and business solutions organization.", "placement_percentage": "25%", "timeline": [{"round": 1, "name": "NQT", "description": "National Qualifier Test", "type": "mcq"}, {"round": 2, "name": "Coding", "description": "Programming Logic", "type": "coding"}]},
                {"name": "Wipro", "about": "Wipro is a leading global information technology, consulting and business process services company.", "placement_percentage": "15%", "timeline": [{"round": 1, "name": "Technical Screen", "description": "Core CS logic", "type": "mcq"}]}
            ]
        }

async def get_dynamic_company_questions(company_name: str, round_type: str):
    """Fetch the robust internal dictionary repository of company-specific mock questions."""
    prompt = f"""
    Act as an expert interviewer for {company_name}. 
    I am taking the '{round_type}' round of their recruitment process.
    If it's an Aptitude round, fetch 3 IndiaBix-level mathematical/logical questions.
    If it's an HR/Communication round, fetch 3 behavioral/situational questions.
    If it's a Technical or Coding round, fetch 1 or 2 actual coding problems (like LeetCode) typically asked by this company.
    
    If providing multiple choice questions, set type to "mcq" and use this schema:
    [
      {{
        "id": "q-1",
        "type": "mcq",
        "question": "Question text",
        "options": ["A", "B", "C", "D"],
        "correct_index": 1,
        "explanation": "Step by step logic resolution"
      }}
    ]
    
    If providing coding questions, set type to "coding" and use this schema:
    [
      {{
        "id": "q-1",
        "type": "coding",
        "question": "Problem statement including constraints and examples",
        "expected_solution": "The optimal code solution in Python or Javascript along with a brief explanation."
      }}
    ]
    
    Return ONLY a raw JSON array containing the questions matching the appropriate schema (do not wrap in markdown).
    """
    model = genai.GenerativeModel("models/gemini-2.5-flash")
    response = model.generate_content(prompt)
    
    try:
        clean_json = response.text.strip().replace("```json", "").replace("```", "")
        questions = json.loads(clean_json)
        # Ensure distinct IDs and default types
        for q in questions:
            q["id"] = f"{company_name[:3]}-{round_type[:3]}-{str(uuid.uuid4())[:8]}"
            if "type" not in q:
                q["type"] = "mcq"
        return questions
    except Exception as e:
        print(f"Error parsing questions JSON: {e}")
        return []
