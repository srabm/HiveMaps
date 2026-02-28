package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.domain.Coordinate
import com.hivemaps.api.campus.domain.IndoorNode
import com.hivemaps.api.campus.domain.IndoorEdge
import com.hivemaps.api.campus.persistence.BuildingJpaRepository
import com.hivemaps.api.campus.persistence.CampusJpaRepository
import com.hivemaps.api.campus.persistence.IndoorNodeJpaRepository
import com.hivemaps.api.campus.persistence.IndoorEdgeJpaRepository
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
class JpaCampusRepository(
    private val campusJpaRepository: CampusJpaRepository,
    private val buildingJpaRepository: BuildingJpaRepository,
    private val indoorNodeJpaRepository: IndoorNodeJpaRepository,
    private val indoorEdgeJpaRepository: IndoorEdgeJpaRepository
) : CampusRepository {

    override fun findAllCampuses(): List<Campus> = campusJpaRepository.findAll().map { it.toDomain() }

    override fun findCampus(id: CampusId): Campus? = campusJpaRepository.findById(id).orElse(null)?.toDomain()

    override fun findBuildingsByCampus(id: CampusId): List<Building> =
        buildingJpaRepository.findAllByCampus_Id(id).map { it.toDomain() }

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

private fun com.hivemaps.api.campus.persistence.CampusEntity.toDomain() = Campus(
    id = id,
    label = label,
    name = name,
    center = Coordinate(lon = centerLon, lat = centerLat),
    zoom = zoom
)

private fun com.hivemaps.api.campus.persistence.BuildingEntity.toDomain() = Building(
    campus = campus.id,
    code = code,
    name = name,
    addresses = addresses,
    location = location,
    center = Coordinate(lon = centerLon, lat = centerLat)
)

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