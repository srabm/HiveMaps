package com.hivemaps.api.campus.domain

data class IndoorNode(
    val id: String,
    val label: String,
    val wheelchairAccessible: Boolean,
    val floor: String,
    val building: String,
    val longitude: Double,
    val latitude: Double,
    val outgoingEdges: MutableList<IndoorEdge>,
    val isVirtual: Boolean
)

data class IndoorEdge(
    val id: String,
    val label: String,
    val wheelchairAccessible: Boolean,
    val startNode: IndoorNode,
    val endNode: IndoorNode,
    val building: String,
    val distance: Double
)

data class Direction(
    val direction: DirectionType,
    val distance: Double,
    val description: String,
    val nodes: MutableList<IndoorNode>
)

enum class DirectionType {
    LEFT,
    RIGHT,
    STRAIGHT,
    BACK,
    UP_OR_DOWN,
}