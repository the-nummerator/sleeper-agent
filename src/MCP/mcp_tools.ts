// In your MCP server
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

export async function isMcpStartedByClaude() {

    const execAsync = promisify(exec);
    try {
        // Get current process info
        const ppid = process.ppid; // Parent process ID
        
        // On Linux/macOS
        if (process.platform !== 'win32') {
            const { stdout } = await execAsync(`ps -o pid,ppid,comm,args -p ${ppid}`);
            console.error('Parent process info:');
            
            // Check if parent contains Claude-related terms
            return stdout.includes('Claude') || 
                   stdout.toLowerCase().includes('claude-desktop');
        }
        
        // On Windows
        else {
            const { stdout } = await execAsync(`wmic process where processid=${ppid} get name,commandline /format:csv`);
            return stdout.toLowerCase().includes('claude') ||
                   stdout.includes('anthropic');
        }
    } catch (error) {
        console.error('Error checking parent process:', error);
        return false;
    }
}
