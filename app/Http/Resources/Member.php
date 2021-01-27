<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class Member extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return array
     */
    public function toArray($request)
    {
        return [
            'id' => $this->user_id,
            'guild_id' => $this->guild_id,
            'is_blacklisted' => $this->is_blacklisted,
            'level' => floor(sqrt($this->xp) * 0.25),
            'xp' => $this->xp,
        ];
    }
}
