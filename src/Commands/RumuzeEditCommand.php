<?php

namespace Rumuze\Edit\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class RumuzeEditCommand extends Command
{
    protected $signature = 'rumuze:edit 
                            {action=start : The action to perform (init, start, stop, status, service)} 
                            {--daemon : Run as a background daemon}';

    protected $description = 'Control OpenCode and AI coding agents on this Laravel project from Telegram';

    public function handle(): int
    {
        $action = $this->argument('action');
        $isDaemon = $this->option('daemon');

        $binPath = realpath(__DIR__ . '/../../bin/rumuze-edit');
        if (!$binPath || !file_exists($binPath)) {
            $this->error('Rumuze Edit CLI binary not found.');
            return 1;
        }

        $baseDir = base_path();
        $args = [$binPath, $action, '--dir', $baseDir];
        if ($isDaemon) {
            $args[] = '--daemon';
        }

        $process = new Process($args, $baseDir, array_merge($_SERVER, $_ENV));
        $process->setTimeout(null);

        if ($action === 'start' && !$isDaemon) {
            $this->info("⚡ Launching Rumuze Edit Control Room for: {$baseDir}");
            $process->setTty(Process::isTtySupported());
            $process->run(function ($type, $buffer) {
                $this->output->write($buffer);
            });
            return $process->getExitCode() ?? 0;
        }

        $process->run();
        $this->output->write($process->getOutput());
        if (!$process->isSuccessful()) {
            $this->output->write($process->getErrorOutput());
        }

        return $process->getExitCode() ?? 0;
    }
}
