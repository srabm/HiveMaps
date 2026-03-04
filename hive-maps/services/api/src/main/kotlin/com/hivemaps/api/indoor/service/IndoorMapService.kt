package com.hivemaps.api.indoor.service

import com.hivemaps.api.indoor.domain.FloorDetails
import com.hivemaps.api.indoor.domain.FloorSummary
import com.hivemaps.api.indoor.domain.SupportedIndoorBuilding
import com.hivemaps.api.indoor.repository.IndoorMapRepository
import org.springframework.stereotype.Service

@Service
class IndoorMapService(
    private val indoorMapRepository: IndoorMapRepository
) {

    fun getSupportedBuildings(): List<SupportedIndoorBuilding> {
        return indoorMapRepository.findSupportedBuildings()
    }

    fun getSupportedBuildingCodes(): Set<String> {
        return getSupportedBuildings().map { it.buildingCode.uppercase() }.toSet()
    }

    fun getBuildingFloors(campusId: String, buildingCode: String): List<FloorSummary> {
        return indoorMapRepository.findFloorsByCampusAndBuilding(campusId, buildingCode)
    }

    fun getFloorDetails(campusId: String, buildingCode: String, floorId: String): FloorDetails? {
        return indoorMapRepository.findFloorDetails(campusId, buildingCode, floorId)
    }
}
