<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Token extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $timestamps = false;

    public function guild()
    {
        return $this->belongsTo(Guild::class);
    }
}
