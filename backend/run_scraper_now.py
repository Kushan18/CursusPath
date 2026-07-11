import asyncio
from services.tracker import process_and_index_data

async def main():
    print("Running scraper to populate database...")
    await process_and_index_data()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
