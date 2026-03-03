package com.hivemaps.api.indoor.repository

import com.hivemaps.api.indoor.domain.FloorDetails
import com.hivemaps.api.indoor.domain.FloorSummary

interface IndoorMapRepository {
    fun findFloorsByCampusAndBuilding(campusId: String, buildingCode: String): List<FloorSummary>
    fun findFloorDetails(campusId: String, buildingCode: String, floorId: String): FloorDetails?
}