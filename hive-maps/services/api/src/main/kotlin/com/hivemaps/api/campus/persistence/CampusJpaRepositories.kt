package com.hivemaps.api.campus.persistence

import com.hivemaps.api.campus.domain.CampusId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CampusJpaRepository : JpaRepository<CampusEntity, CampusId>

@Repository
interface BuildingJpaRepository : JpaRepository<BuildingEntity, String> {
    fun findAllByCampusId(campusId: CampusId): List<BuildingEntity>
}
