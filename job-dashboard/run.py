#!/usr/bin/env python3
"""CLI runner for job applications - can be triggered from dashboard or cron."""
import argparse
import json
import sys
import time
from pathlib import Path

# Add workspace to path
sys.path.insert(0, '/Users/gagandeep/.openclaw/workspace')

from apply_runner import ApplicationRunner

def main():
    parser = argparse.ArgumentParser(description='Job Application Runner')
    parser.add_argument('--platforms', '-p', type=str, default='linkedin,cutshort,instahyre',
                       help='Comma-separated list of platforms to run')
    parser.add_argument('--linkedin-count', type=int, default=4,
                       help='Number of LinkedIn jobs to apply')
    parser.add_argument('--cutshort-count', type=int, default=5,
                       help='Number of Cutshort jobs to apply')
    parser.add_argument('--instahyre-count', type=int, default=3,
                       help='Number of Instahyre jobs to apply')
    parser.add_argument('--dry-run', action='store_true',
                       help='Simulate without actually applying')
    parser.add_argument('--output', '-o', type=str, default='',
                       help='Output file for results JSON')
    
    args = parser.parse_args()
    
    platforms = [p.strip() for p in args.platforms.split(',')]
    
    print("=" * 60)
    print("JOB APPLICATION RUNNER")
    print("=" * 60)
    print(f"\nPlatforms: {', '.join(platforms)}")
    print(f"LinkedIn: {args.linkedin_count} jobs")
    print(f"Cutshort: {args.cutshort_count} jobs")
    print(f"Instahyre: {args.instahyre_count} jobs")
    if args.dry_run:
        print("\n⚠️  DRY RUN - No actual applications will be sent")
    print("\n" + "=" * 60)
    
    runner = ApplicationRunner()
    
    if args.dry_run:
        # Simulate results
        report = {
            'applied': 8,
            'skipped': 1,
            'failed': 0,
            'jobs': [
                {'title': 'Senior Backend Developer', 'company': 'Cloudnaut', 'platform': 'linkedin', 'status': 'Applied'},
                {'title': 'GenAI Engineer', 'company': '9NEXUS', 'platform': 'linkedin', 'status': 'Applied'},
                {'title': 'GenAI & Agentic AI', 'company': 'Altysys', 'platform': 'linkedin', 'status': 'Skipped'},
                {'title': 'Head Of Engineering (AI)', 'company': 'Company 1', 'platform': 'cutshort', 'status': 'Applied'},
                {'title': 'Lead Python Developer', 'company': 'Company 2', 'platform': 'cutshort', 'status': 'Applied'},
                {'title': 'Sr. Full-Stack Developer', 'company': 'Company 3', 'platform': 'cutshort', 'status': 'Applied'},
                {'title': 'AI Security Architect', 'company': 'NTT Data', 'platform': 'instahyre', 'status': 'Applied'},
                {'title': 'Staff Engineer', 'company': 'Imagine Learning', 'platform': 'instahyre', 'status': 'Applied'},
                {'title': 'Golang Engineer', 'company': 'Walmart', 'platform': 'instahyre', 'status': 'Applied'},
            ]
        }
        print("\n📊 Simulated Results:")
        print(f"  Applied: {report['applied']}")
        print(f"  Skipped: {report['skipped']}")
        print(f"  Failed: {report['failed']}")
    else:
        report = runner.run_all(platforms)
    
    # Save results
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n💾 Results saved to: {args.output}")
    
    # Also save to daily log
    daily_log = Path('/Users/gagandeep/.openclaw/workspace/job-apply-log.md')
    with open(daily_log, 'a') as f:
        f.write(f"\n\n## {datetime.now().strftime('%Y-%m-%d %H:%M')} - Dashboard Run\n\n")
        f.write(f"Applied: {report['applied']}\n")
        f.write(f"Skipped: {report['skipped']}\n")
        f.write(f"Failed: {report['failed']}\n\n")
        for job in report['jobs']:
            f.write(f"- {'✅' if job['status'] == 'Applied' else '⏭️'} [{job['platform']}] {job['title']} @ {job['company']}\n")
    
    print("\n✅ Done!")
    return 0 if report['failed'] == 0 else 1

if __name__ == '__main__':
    from datetime import datetime
    sys.exit(main())
