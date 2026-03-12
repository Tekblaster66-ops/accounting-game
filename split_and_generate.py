#!/usr/bin/env python3
"""
Split the BIWS guide into sections and generate NotebookLM audio for each.
Run: /home/rcoene/accounting-game/.venv/bin/python split_and_generate.py
"""
import subprocess
import os
import time

VENV_BIN = "/home/rcoene/accounting-game/.venv/bin"
NOTEBOOKLM = f"{VENV_BIN}/notebooklm"
GUIDE_TXT = "/tmp/biws-guide.txt"
SECTIONS_DIR = "/tmp/biws-sections"
AUDIO_DIR = "/home/rcoene/accounting-game/audio"

# Section boundaries (line numbers from the guide text)
SECTIONS = [
    {"start": 55, "end": 384, "name": "Key Rule 1 - Income Statement and Working Capital",
     "prompt": "A deep dive on the Income Statement, Working Capital items like AR, AP, Deferred Revenue, Inventory, and Prepaid Expenses. Explain why Cash Flow differs from Net Income with concrete examples."},
    {"start": 385, "end": 593, "name": "Key Rule 2 - CapEx Depreciation and Business Funding",
     "prompt": "A deep dive on Capital Expenditures, Depreciation, PP&E, issuing Debt and Equity, Dividends, Stock Repurchases, and Preferred Stock. Use the guide's examples with specific numbers."},
    {"start": 594, "end": 772, "name": "Key Rule 3 - Operating and Finance Leases",
     "prompt": "A deep dive on Operating Leases vs Finance Leases, how they appear on all three statements, the difference between GAAP and IFRS treatment, and the 2019 rule changes."},
    {"start": 773, "end": 798, "name": "Key Rule 4 - Financial Investments",
     "prompt": "A deep dive on how Financial Investments (stocks, bonds) appear on the three statements, including Interest Income and Gains/Losses on sales."},
    {"start": 799, "end": 949, "name": "Key Rule 5 - Deferred Taxes and NOLs",
     "prompt": "A deep dive on Book vs Cash tax differences, Deferred Tax Liabilities, Deferred Tax Assets, accelerated depreciation, and Net Operating Losses. Walk through specific numerical examples."},
    {"start": 950, "end": 1071, "name": "Key Rule 6 - Gains Losses Impairments Write-Downs",
     "prompt": "A deep dive on Gains and Losses on asset sales, PP&E Write-Downs and Impairments, tax deductibility, and how these flow through the three statements."},
    {"start": 1072, "end": 1137, "name": "Key Rule 7 - Stock-Based Compensation",
     "prompt": "A deep dive on Stock-Based Compensation: how it's expensed on the IS, added back on the CFS, and why it matters for valuation despite being non-cash. Cover tax deductibility."},
    {"start": 1138, "end": 1239, "name": "Key Rule 8 - Goodwill and Intangibles from M&A",
     "prompt": "A deep dive on M&A accounting: how Goodwill and Other Intangible Assets are created, how they change over time, Amortization, Goodwill Impairments, and tax treatment."},
    {"start": 1240, "end": 1349, "name": "Key Rule 9 - US GAAP vs IFRS",
     "prompt": "A deep dive on key differences between US GAAP and IFRS accounting standards, especially how the CFS differs, where Dividends and Interest appear, and lease treatment."},
    {"start": 1350, "end": 1602, "name": "Key Rule 10 - Summary of Three Financial Statements",
     "prompt": "A comprehensive summary of the Income Statement, Balance Sheet, and Cash Flow Statement structures, what goes on each, and how they connect to each other."},
    {"start": 1603, "end": 1821, "name": "Key Rule 11 - Linking and Projecting Statements",
     "prompt": "A deep dive on how to link the three financial statements together, project them forward, and understand the connections between Net Income, the CFS, and the Balance Sheet."},
    {"start": 1822, "end": 2085, "name": "Key Rule 12 - Free Cash Flow and Working Capital",
     "prompt": "A deep dive on Free Cash Flow calculation, why FCF matters, the Change in Working Capital formula, and how these connect to company valuation."},
    {"start": 2086, "end": 2223, "name": "Key Rule 13 - Key Metrics and Ratios",
     "prompt": "A deep dive on ROE, ROA, ROIC, EBITDA, Leverage Ratios, Interest Coverage, DSO, DIO, DPO, and the Cash Conversion Cycle with numerical examples."},
    {"start": 2224, "end": 2700, "name": "Key Rule 14 - How to Answer Interview Questions",
     "prompt": "A deep dive on the framework for answering accounting interview questions: walking through statements step by step, handling single-step and multi-step changes, and common pitfalls."},
]


def run(cmd, timeout=60):
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    return result.stdout.strip(), result.returncode


def extract_section(start, end):
    """Extract lines from the guide text file."""
    lines = []
    with open(GUIDE_TXT, 'r') as f:
        for i, line in enumerate(f, 1):
            if i >= start and i <= end:
                lines.append(line)
            if i > end:
                break
    return ''.join(lines)


def main():
    os.makedirs(SECTIONS_DIR, exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)

    for i, section in enumerate(SECTIONS):
        print(f"\n[{i+1}/{len(SECTIONS)}] {section['name']}")

        # Extract section text
        text = extract_section(section['start'], section['end'])
        source_path = os.path.join(SECTIONS_DIR, f"section_{i+1:02d}.md")
        with open(source_path, 'w') as f:
            f.write(f"# {section['name']}\n\n{text}")
        print(f"  Extracted {len(text)} chars to {source_path}")

        # Create notebook
        print("  Creating notebook...")
        out, rc = run([NOTEBOOKLM, "create", section['name']])
        if rc != 0:
            print(f"  FAILED to create notebook: {out}")
            continue
        notebook_id = out.split(":")[0].replace("Created notebook", "").strip()
        print(f"  Notebook: {notebook_id}")

        # Set context
        run([NOTEBOOKLM, "use", notebook_id])

        # Add source
        print("  Adding source...")
        out, rc = run([NOTEBOOKLM, "source", "add", source_path], timeout=30)
        if rc != 0:
            print(f"  FAILED to add source: {out}")
            continue

        # Generate audio
        print("  Generating audio (may take several minutes)...")
        out, rc = run(
            [NOTEBOOKLM, "generate", "audio", section['prompt'],
             "--format", "deep-dive", "--wait"],
            timeout=600
        )
        if rc != 0:
            print(f"  Audio generation timeout or error. Will check later.")
            # Try to download anyway after a short wait
            time.sleep(10)

        # Download
        safe_name = section['name'].replace(' ', '_').replace('-', '').lower()
        output_path = os.path.join(AUDIO_DIR, f"{safe_name}.mp3")
        print(f"  Downloading to {output_path}...")
        out, rc = run(
            [NOTEBOOKLM, "download", "audio", "--latest", output_path],
            timeout=120
        )
        if rc == 0:
            print(f"  SUCCESS: {output_path}")
        else:
            print(f"  Download issue: {out}")

        # Small delay between sections
        time.sleep(5)

    print("\n=== Done! Audio files: ===")
    for f in sorted(os.listdir(AUDIO_DIR)):
        print(f"  {f}")


if __name__ == "__main__":
    main()
