package com.hivemaps.api.campus.persistence

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface IndoorNodeJpaRepository : JpaRepository<IndoorNodeEntity, String> {
    fun findAllByBuilding(building: String): List<IndoorNodeEntity>
}

@Repository
interface IndoorEdgeJpaRepository : JpaRepository<IndoorEdgeEntity, String> {
    fun findAllByBuilding(building: String): List<IndoorEdgeEntity>
}