<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BlacklistedChannel extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $incrementing = false;

    public $timestamps = false;

    public function guild()
    {
        return $this->belongsTo(Guild::class);
    }
}
