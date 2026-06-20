#!/usr/bin/env python3
"""Main runner script that coordinates all platform applications with real-time status updates."""
import asyncio
import json
import time
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Platform scripts
PLATFORM_SCRIPTS = {
    'linkedin': '/Users/gagandeep/.openclaw/workspace/linkedin_click_then_apply.py',
    'cutshort': '/Users/gagandeep/.openclaw/workspace/cutshort_apply_10.py',
    'instahyre': '/Users/gagandeep/.openclaw/workspace/instahyre_apply_proper.py',
    'naukri': None,  # Not yet implemented
}

class ApplicationRunner:
    def __init__(self):
        self.status_file = Path('/Users/gagandeep/.openclaw/workspace/job-dashboard/status.json')
        self.log_file = Path('/Users/gagandeep/.openclaw/workspace/job-dashboard/run.log')
        self.results = {
            'linkedin': [],
            'cutshort': [],
            'instahyre': [],
            'naukri': []
        }
        self.is_running = False
    
    def emit_status(self, data):
        """Emit status update for the dashboard."""
        # Write to status file for polling
        status = {
            'timestamp': datetime.now().isoformat(),
            'running': self.is_running,
            'data': data
        }
        with open(self.status_file, 'w') as f:
            json.dump(status, f)
        
        # Also append to log
        with open(self.log_file, 'a') as f:
            f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {json.dumps(data)}\n")
    
    def run_platform(self, platform):
        """Run a single platform's application script."""
        script = PLATFORM_SCRIPTS.get(platform)
        if not script or not Path(script).exists():
            self.emit_status({
                'type': 'log',
                'message': f'❌ Script not found for {platform}',
                'level': 'error'
            })
            return {'applied': 0, 'failed': 0, 'jobs': []}
        
        self.emit_status({
            'type': 'status',
            'platform': platform,
            'status': 'running',
            'text': 'Running...'
        })
        
        self.emit_status({
            'type': 'log',
            'message': f'🚀 Starting {platform} applications...',
            'level': 'info'
        })
        
        try:
            # Run the script and capture output
            result = subprocess.run(
                [sys.executable, script],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            # Parse output to extract job results
            # This is a simplified parser - real implementation would parse JSON output
            output = result.stdout + result.stderr
            
            # Extract applied jobs from output
            jobs = self.parse_output(platform, output)
            
            self.emit_status({
                'type': 'status',
                'platform': platform,
                'status': 'done',
                'text': f"Done ({len(jobs)} applied)"
            })
            
            return {
                'applied': len([j for j in jobs if j['status'] == 'applied']),
                'failed': len([j for j in jobs if j['status'] == 'failed']),
                'jobs': jobs
            }
            
        except subprocess.TimeoutExpired:
            self.emit_status({
                'type': 'log',
                'message': f'⏱ {platform} timed out after 5 minutes',
                'level': 'error'
            })
            return {'applied': 0, 'failed': 0, 'jobs': []}
            
        except Exception as e:
            self.emit_status({
                'type': 'log',
                'message': f'❌ Error running {platform}: {str(e)}',
                'level': 'error'
            })
            return {'applied': 0, 'failed': 0, 'jobs': []}
    
    def parse_output(self, platform, output):
        """Parse script output to extract job application results."""
        jobs = []
        
        # Look for patterns like "Applied: X/Y" or job titles with checkmarks
        lines = output.split('\n')
        
        for line in lines:
            line = line.strip()
            
            # Parse applied jobs
            if 'Applied!' in line or 'applied successfully' in line:
                # Try to extract job name from previous lines
                jobs.append({
                    'title': 'Unknown Job',
                    'company': 'Unknown',
                    'status': 'applied',
                    'platform': platform
                })
            
            # Parse skipped/failed
            elif 'No Easy Apply' in line or 'skipped' in line:
                jobs.append({
                    'title': 'Unknown Job',
                    'company': 'Unknown',
                    'status': 'skipped',
                    'platform': platform
                })
        
        return jobs
    
    def run_all(self, platforms=None):
        """Run applications for specified platforms (or all if None)."""
        platforms = platforms or ['linkedin', 'cutshort', 'instahyre']
        self.is_running = True
        
        total_applied = 0
        total_failed = 0
        all_jobs = []
        
        self.emit_status({
            'type': 'log',
            'message': f'🚀 Starting batch apply for: {", ".join(platforms)}',
            'level': 'info'
        })
        
        for i, platform in enumerate(platforms):
            progress = int((i / len(platforms)) * 100)
            self.emit_status({
                'type': 'progress',
                'percent': progress,
                'title': f'Running {platform}...'
            })
            
            result = self.run_platform(platform)
            total_applied += result['applied']
            total_failed += result['failed']
            all_jobs.extend(result['jobs'])
            
            self.results[platform] = result['jobs']
        
        self.emit_status({
            'type': 'progress',
            'percent': 100,
            'title': 'Complete!'
        })
        
        # Generate final report
        report = {
            'applied': total_applied,
            'skipped': len([j for j in all_jobs if j['status'] == 'skipped']),
            'failed': total_failed,
            'jobs': all_jobs
        }
        
        self.emit_status({
            'type': 'complete',
            'report': report
        })
        
        self.is_running = False
        
        return report


if __name__ == '__main__':
    runner = ApplicationRunner()
    
    # Parse command line args
    if len(sys.argv) > 1:
        platforms = sys.argv[1].split(',')
    else:
        platforms = None
    
    report = runner.run_all(platforms)
    print(json.dumps(report, indent=2))
