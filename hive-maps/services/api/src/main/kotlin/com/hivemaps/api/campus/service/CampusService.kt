package com.hivemaps.api.campus.service

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.domain.Direction
import com.hivemaps.api.campus.repository.CampusRepository
import org.springframework.stereotype.Service

@Service
class CampusService(
    private val campusRepository: CampusRepository,
    private val indoorDirections: IndoorDirections
) {
    fun getCampuses(): List<Campus> = campusRepository.findAllCampuses()

    fun getCampus(id: CampusId): Campus? = campusRepository.findCampus(id)

    fun getBuildings(id: CampusId): List<Building> = campusRepository.findBuildingsByCampus(id)

    fun getDirections(building: String, startNodeId: String, endNodeId: String, accessibleOnly: Boolean = false): List<Direction> {
        val nodes = campusRepository.findIndoorNodesByBuilding(building)
        val startNode = nodes[startNodeId] ?: throw IllegalArgumentException("Start node not found")
        val endNode = nodes[endNodeId] ?: throw IllegalArgumentException("End Node not found")

        return indoorDirections.getDirections(startNode, endNode, accessibleOnly)
    }
}

