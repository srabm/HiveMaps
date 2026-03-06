package com.hivemaps.api.campus.service

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.repository.CampusRepository
import com.hivemaps.api.indoor.service.IndoorMapService
import org.springframework.stereotype.Service

@Service
class CampusService(
    private val campusRepository: CampusRepository,
    private val indoorMapService: IndoorMapService,
) {
    fun getCampuses(): List<Campus> = campusRepository.findAllCampuses()

    fun getCampus(id: CampusId): Campus? = campusRepository.findCampus(id)

    fun getBuildings(id: CampusId): List<Building> {
        val indoorBuildingCodes = indoorMapService.getSupportedBuildingCodes()
        return campusRepository.findBuildingsByCampus(id).map { building ->
            building.copy(hasIndoorMap = indoorBuildingCodes.contains(building.code.uppercase()))
        }
    }
}

