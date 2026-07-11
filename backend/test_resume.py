import os
from dotenv import load_dotenv
from services.resume_analysis_orchestrator import run_resume_analysis, run_resume_build

load_dotenv()

fake_resume = """
John Doe
Software Engineer
john@example.com

Summary
I am a software engineer.

Experience
Software Developer at TechCorp (2020-2023)
- Responsible for writing code and fixing bugs.
- Worked on a team to build an app.
- Did some testing.

Skills
Java, Python, HTML
"""

fake_jd = """
Looking for a Senior Python Developer with 5+ years of experience.
Must have strong skills in Python, Django, and REST APIs.
Experience with CI/CD and cloud platforms (AWS) is a huge plus.
"""

def test():
    print("=== TESTING ANALYZER WITHOUT JD ===")
    res_no_jd = run_resume_analysis(fake_resume, "")
    print(res_no_jd)

    print("\n=== TESTING ANALYZER WITH JD ===")
    res_with_jd = run_resume_analysis(fake_resume, fake_jd)
    print(res_with_jd)

    print("\n=== TESTING BUILDER WITHOUT JD ===")
    b_no_jd = run_resume_build(fake_resume, "", "")
    print(b_no_jd)

    print("\n=== TESTING BUILDER WITH JD ===")
    b_with_jd = run_resume_build(fake_resume, "Cloud Co", fake_jd)
    print(b_with_jd)

if __name__ == "__main__":
    test()
