<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guild extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $incrementing = false;

    public $timestamps = false;

    public function blacklistedChannels()
    {
        return $this->hasMany(BlacklistedChannel::class);
    }

    public function members()
    {
        return $this->hasMany(Member::class);
    }

    public function ranks()
    {
        return $this->hasMany(Rank::class);
    }

    public function tokens()
    {
        return $this->hasMany(Token::class);
    }
}
