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
            'guild_id' => $this->guild_id,
            'is_blacklisted' => $this->is_blacklisted,
            'user_id' => $this->user_id,
            'xp' => $this->xp,
        ];
    }
}
