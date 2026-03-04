package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.IndoorNode
import com.hivemaps.api.campus.domain.IndoorEdge
import com.hivemaps.api.campus.persistence.IndoorNodeJpaRepository
import com.hivemaps.api.campus.persistence.IndoorEdgeJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
class JpaIndoorDirectionsRepository(
    private val indoorNodeJpaRepository: IndoorNodeJpaRepository,
    private val indoorEdgeJpaRepository: IndoorEdgeJpaRepository
) : IndoorDirectionsRepository {

    @Transactional(readOnly = true)
    override fun findIndoorNodesByBuilding(building: String): Map<String, IndoorNode> {
        val nodes = mutableMapOf<String, IndoorNode>()

        // pass 1 - create all nodes
        indoorNodeJpaRepository.findAllByBuilding(building).forEach {
            nodes[it.id] = it.toDomain()
        }
        
        // pass 2 - populate edges
        indoorEdgeJpaRepository.findAllByBuilding(building).forEach {
            val edge = IndoorEdge(
                id = it.id,
                label = it.label,
                wheelchairAccessible = it.wheelchairAccessible,
                startNode = nodes[it.startNode.id]!!,
                endNode = nodes[it.endNode.id]!!,
                building = it.building,
                distance = it.distance
            )
            nodes[it.startNode.id]?.outgoingEdges?.add(edge)
        }
        
        return nodes
    }
}

private fun com.hivemaps.api.campus.persistence.IndoorNodeEntity.toDomain() = IndoorNode(
    id = id,
    label = label,
    wheelchairAccessible = wheelchairAccessible,
    floor = floor,
    building = building,
    longitude = lon,
    latitude = lat,
    outgoingEdges = mutableListOf(),
    isVirtual = isVirtual
)