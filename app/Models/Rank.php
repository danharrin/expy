<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Rank extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $timestamps = false;

    public function guild()
    {
        return $this->belongsTo(Guild::class);
    }
}
