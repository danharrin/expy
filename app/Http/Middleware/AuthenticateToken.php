<?php

namespace App\Http\Middleware;

use App\Models\Guild;
use App\Models\Token;
use Closure;
use Illuminate\Http\Request;

class AuthenticateToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        Token::where([
            'guild' => $request->route()->getParameter('guild'),
            'key' => $request->bearerToken(),
        ])->firstOrFail();

        return $next($request);
    }
}
