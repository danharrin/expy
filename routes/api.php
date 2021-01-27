<?php

use App\Http\Middleware\AuthenticateToken;
use App\Http\Resources\Member as MemberResource;
use App\Models\Guild;
use App\Models\Member;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::get('members/{userId}', function (Guild $guild, $userId) {
    $member = $guild->members()->firstOrCreate(['user_id', $userId]);

    return new MemberResource($member);
});

Route::patch('members/{userId}', function (Guild $guild, $userId, Request $request) {
    $member = $guild->members()->firstOrCreate(['user_id', $userId]);

    $request->validate([
        'xp' => ['nullable', 'integer'],
        'xpChange' => ['nullable', 'integer'],
    ]);

    if ($request->has('xp')) $member->xp = $request->input('xp');
    if ($request->has('xpChange')) $member->xp += $request->input('xpChange');

    $member->save();

    return new MemberResource($member);
});