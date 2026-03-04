package com.hivemaps.api.campus.service

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.repository.CampusRepository
import org.springframework.stereotype.Service

@Service
class CampusService(
    private val campusRepository: CampusRepository
) {
    fun getCampuses(): List<Campus> = campusRepository.findAllCampuses()

    fun getCampus(id: CampusId): Campus? = campusRepository.findCampus(id)

    fun getBuildings(id: CampusId): List<Building> = campusRepository.findBuildingsByCampus(id)
}

