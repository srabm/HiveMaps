package com.hivemaps.api.campus.persistence

import com.hivemaps.api.campus.domain.CampusId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CampusJpaRepository : JpaRepository<CampusEntity, CampusId>

@Repository
interface BuildingJpaRepository : JpaRepository<BuildingEntity, String> {
    fun findAllByCampus_Id(campusId: CampusId): List<BuildingEntity>
}

@Repository
interface IndoorNodeJpaRepository : JpaRepository<IndoorNodeEntity, String> {
    fun findAllByBuilding(building: String): List<IndoorNodeEntity>
}

@Repository
interface IndoorEdgeJpaRepository : JpaRepository<IndoorEdgeEntity, String> {
    fun findAllByBuilding(building: String): List<IndoorEdgeEntity>
}