package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.domain.IndoorNode

interface CampusRepository {
    fun findAllCampuses(): List<Campus>
    fun findCampus(id: CampusId): Campus?
    fun findBuildingsByCampus(id: CampusId): List<Building>
    fun findIndoorNodesByBuilding(building: String): Map<String, IndoorNode>
}
