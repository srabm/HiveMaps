package com.hivemaps.api.campus.api

data class DirectionResponse(
    val direction: DirectionTypeResponse,
    val distance: Double,
    val description: String,
    val nodes: List<IndoorNodeResponse>
)