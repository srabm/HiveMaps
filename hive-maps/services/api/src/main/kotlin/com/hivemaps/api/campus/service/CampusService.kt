package com.hivemaps.api.campus.service

import java.util.PriorityQueue
import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.domain.IndoorNode
import com.hivemaps.api.campus.repository.CampusRepository
import org.springframework.stereotype.Service

@Service
class CampusService(
    private val campusRepository: CampusRepository
) {
    fun getCampuses(): List<Campus> = campusRepository.findAllCampuses()

    fun getCampus(id: CampusId): Campus? = campusRepository.findCampus(id)

    fun getBuildings(id: CampusId): List<Building> = campusRepository.findBuildingsByCampus(id)

    fun getPath(building: String, startNodeId: String, endNodeId: String): List<Map<String, Any>>? {
        val nodes = campusRepository.findIndoorNodesByBuilding(building)
        val startNode = nodes[startNodeId] ?: throw IllegalArgumentException("Start node not found")
        val endNode = nodes[endNodeId] ?: throw IllegalArgumentException("End Node not found")

        val distances = mutableMapOf<String, Double>().withDefault { Double.MAX_VALUE }
        val previous = mutableMapOf<String, IndoorNode?>().withDefault { null }
        val visited = mutableMapOf<String, Boolean>().withDefault { false }
        val pq = PriorityQueue<Pair<Double, IndoorNode>>(compareBy { it.first })
        var pathFound = false

        distances[startNodeId] = 0.0
        pq.add(0.0 to startNode)

        while (pq.isNotEmpty()) {
            val (dist, node) = pq.poll()

            if (visited.getValue(node.id)) continue
            if (node.id == endNodeId) {
                pathFound = true
                break
            }

            node.outgoingEdges.forEach { edge ->
                val newDist = dist + edge.distance
                if (newDist < distances.getValue(edge.endNode.id)) {
                    distances[edge.endNode.id] = newDist
                    previous[edge.endNode.id] = node
                    pq.add(newDist to edge.endNode)
                }
            }

            visited[node.id] = true
        }

        if (!pathFound) {
            return null
        }

        // reconstruct path
        val path = mutableListOf<IndoorNode>()
        var current: IndoorNode? = endNode
        while (current != null) {
            path.add(current)
            current = previous.getValue(current.id)
        }

        // return the path without the outgoingEdges attribute
        return path.reversed().map { mapOf(
            "id" to it.id,
            "label" to it.label,
            "wheelchairAccessible" to it.wheelchairAccessible,
            "floor" to it.floor,
            "building" to it.building,
            "longitude" to it.longitude,
            "latitude" to it.latitude
        )}
    }
}

