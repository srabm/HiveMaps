package com.hivemaps.api.campus.service

import java.util.PriorityQueue
import com.hivemaps.api.campus.domain.IndoorNode
import com.hivemaps.api.campus.domain.IndoorEdge
import com.hivemaps.api.campus.domain.Direction
import com.hivemaps.api.campus.domain.DirectionType
import org.springframework.stereotype.Component

@Component
class IndoorDirections {
    private fun getPath(startNode: IndoorNode, endNode: IndoorNode, accessibleOnly: Boolean = false): List<IndoorEdge> {
        if (accessibleOnly && !startNode.wheelchairAccessible) return emptyList()
        if (accessibleOnly && !endNode.wheelchairAccessible) return emptyList()

        val distances = mutableMapOf<String, Double>().withDefault { Double.MAX_VALUE }
        val connectingEdge = mutableMapOf<String, IndoorEdge?>().withDefault { null }
        val visited = mutableMapOf<String, Boolean>().withDefault { false }
        val pq = PriorityQueue<Pair<Double, IndoorNode>>(compareBy { it.first })
        var pathFound = false

        distances[startNode.id] = 0.0
        pq.add(0.0 to startNode)

        while (pq.isNotEmpty()) {
            val (dist, node) = pq.poll()

            if (visited.getValue(node.id)) continue
            if (node.id == endNode.id) {
                pathFound = true
                break
            }

            node.outgoingEdges.forEach { edge ->
                val newDist = dist + edge.distance
                if (newDist < distances.getValue(edge.endNode.id) && //criteria 1: endNode can be navigated to in a faster way
                   (!accessibleOnly || (edge.wheelchairAccessible && edge.endNode.wheelchairAccessible))) { //criteria 2: the path is wheelchair accessible if required
                    distances[edge.endNode.id] = newDist
                    connectingEdge[edge.endNode.id] = edge
                    pq.add(newDist to edge.endNode)
                }
            }

            visited[node.id] = true
        }

        if (!pathFound) {
            return emptyList()
        }

        // reconstruct path
        val path = mutableListOf<IndoorEdge>()
        var current: IndoorEdge? = connectingEdge.getValue(endNode.id)
        while (current != null) {
            path.add(current)
            current = connectingEdge.getValue(current.startNode.id)
        }

        return path.reversed()
    }

    // Returns the angle of an edge in degrees ( from -180 to 180 )
    private fun getAngle(edge: IndoorEdge): Double {
        val dx = edge.endNode.longitude - edge.startNode.longitude 
        val dy = edge.endNode.latitude - edge.startNode.latitude

        return Math.toDegrees(Math.atan2(dy, dx))
    }

    // assume first and last directions are "move straight"
    fun getDirections(startNode: IndoorNode, endNode: IndoorNode, accessibleOnly: Boolean = false): List<Direction> {
        val path = getPath(startNode, endNode, accessibleOnly)

        if (path.isEmpty()) return emptyList()

        val directions = mutableListOf<Direction>()
        var previousEdgeAngle: Double? = null
        var nodes = mutableListOf<IndoorNode>()
        var distance = 0.0

        path.forEach { edge ->
            nodes.add(edge.startNode)
            val currentAngle = getAngle(edge)

            val directionType = when {
                edge.startNode.floor != edge.endNode.floor -> DirectionType.UP_OR_DOWN
                previousEdgeAngle == null -> DirectionType.STRAIGHT
                else -> {
                    val angleDiff = ((currentAngle - previousEdgeAngle!!) + 540) % 360 - 180
                    when {
                        -45 < angleDiff && angleDiff <= 45 -> DirectionType.STRAIGHT
                        45 <= angleDiff && angleDiff <= 135 -> DirectionType.LEFT
                        -135 <= angleDiff && angleDiff <= -45 -> DirectionType.RIGHT
                        else -> DirectionType.BACK
                    }
                }
            }
            
            if (directionType == DirectionType.STRAIGHT) {
                previousEdgeAngle = currentAngle
                distance += edge.distance
                return@forEach
            }
            if (distance > 0.0) {
                directions.add(
                    Direction(
                        direction = DirectionType.STRAIGHT,
                        distance = distance,
                        description = "Go straight %.2fm".format(distance),
                        nodes = nodes
                    )
                )
                nodes = mutableListOf()
                distance = 0.0
            }

            val description = when (directionType) {
                DirectionType.LEFT -> "Turn left"
                DirectionType.RIGHT -> "Turn right"
                DirectionType.BACK -> "Turn around"
                DirectionType.UP_OR_DOWN -> "Take the stairs/escalator/elevator to floor ${edge.endNode.floor}"
                DirectionType.STRAIGHT -> "Go straight"
            }

            if (directionType == DirectionType.UP_OR_DOWN) {
                directions.add(
                    Direction(
                        direction = DirectionType.UP_OR_DOWN,
                        distance = 0.0,
                        description = description,
                        nodes = mutableListOf(edge.startNode, edge.endNode)
                    )
                )
                nodes = mutableListOf()
            }
            else {
                directions.add(
                    Direction(
                        direction = directionType,
                        distance = 0.0,
                        description = description,
                        nodes = mutableListOf(edge.startNode)
                    )
                )
                distance = edge.distance
                nodes = mutableListOf(edge.startNode)
            }

            previousEdgeAngle = currentAngle
        }

        // the last direction is assumed to be straight
        nodes.add(path.last().endNode)
        directions.add(
            Direction(
                direction = DirectionType.STRAIGHT,
                distance = distance,
                description = "Go straight %.2fm".format(distance),
                nodes = nodes
            )
        )

        return directions
    }
}
  