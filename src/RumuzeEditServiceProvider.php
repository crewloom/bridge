<?php

namespace Rumuze\Edit;

use Illuminate\Support\ServiceProvider;
use Rumuze\Edit\Commands\RumuzeEditCommand;

class RumuzeEditServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([
                RumuzeEditCommand::class,
            ]);
        }
    }

    public function register(): void
    {
        //
    }
}
