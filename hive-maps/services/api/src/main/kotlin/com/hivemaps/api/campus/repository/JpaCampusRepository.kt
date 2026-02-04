package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.Building
import com.hivemaps.api.campus.domain.Campus
import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.domain.Coordinate
import com.hivemaps.api.campus.persistence.BuildingJpaRepository
import com.hivemaps.api.campus.persistence.CampusJpaRepository
import org.springframework.stereotype.Repository

@Repository
class JpaCampusRepository(
    private val campusJpaRepository: CampusJpaRepository,
    private val buildingJpaRepository: BuildingJpaRepository
) : CampusRepository {

    override fun findAllCampuses(): List<Campus> = campusJpaRepository.findAll().map { it.toDomain() }

    override fun findCampus(id: CampusId): Campus? = campusJpaRepository.findById(id).orElse(null)?.toDomain()

    override fun findBuildingsByCampus(id: CampusId): List<Building> =
        buildingJpaRepository.findAllByCampus_Id(id).map { it.toDomain() }
}

private fun com.hivemaps.api.campus.persistence.CampusEntity.toDomain() = Campus(
    id = id,
    label = label,
    name = name,
    center = Coordinate(lon = centerLon, lat = centerLat),
    zoom = zoom
)

private fun com.hivemaps.api.campus.persistence.BuildingEntity.toDomain() = Building(
    campus = campus.id,
    code = code,
    name = name,
    addresses = addresses,
    location = location
)
