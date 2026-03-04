package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.IndoorNode

fun interface IndoorDirectionsRepository {
    fun findIndoorNodesByBuilding(building: String): Map<String, IndoorNode>
}
