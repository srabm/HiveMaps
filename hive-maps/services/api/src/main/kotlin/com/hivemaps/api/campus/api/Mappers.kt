package com.hivemaps.api.campus.api

import com.hivemaps.api.campus.domain.IndoorNode
import com.hivemaps.api.campus.domain.Direction
import com.hivemaps.api.campus.domain.DirectionType

fun IndoorNode.toResponse() = IndoorNodeResponse(
    id = id,
    label = label,
    wheelchairAccessible = wheelchairAccessible,
    floor = floor,
    building = building,
    longitude = longitude,
    latitude = latitude
)

fun Direction.toResponse() = DirectionResponse(
    direction = direction.toResponse(),
    distance = distance,
    description = description,
    nodes = nodes.map { it.toResponse() }
)

fun DirectionType.toResponse() = when (this) {
    DirectionType.LEFT -> DirectionTypeResponse.LEFT
    DirectionType.RIGHT -> DirectionTypeResponse.RIGHT
    DirectionType.STRAIGHT -> DirectionTypeResponse.STRAIGHT
    DirectionType.BACK -> DirectionTypeResponse.BACK
    DirectionType.UP_OR_DOWN -> DirectionTypeResponse.UP_OR_DOWN
}