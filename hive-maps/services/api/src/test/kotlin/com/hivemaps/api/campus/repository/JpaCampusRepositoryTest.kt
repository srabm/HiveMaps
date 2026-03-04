package com.hivemaps.api.campus.repository

import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.persistence.BuildingEntity
import com.hivemaps.api.campus.persistence.BuildingJpaRepository
import com.hivemaps.api.campus.persistence.CampusEntity
import com.hivemaps.api.campus.persistence.CampusJpaRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import java.util.Optional

class JpaCampusRepositoryTest {

    private val campusJpaRepository = mock(CampusJpaRepository::class.java)
    private val buildingJpaRepository = mock(BuildingJpaRepository::class.java)
    private val repository = JpaCampusRepository(campusJpaRepository, buildingJpaRepository)

    @Test
    fun `findCampus maps entity to domain when found`() {
        val campusEntity = CampusEntity(
            id = CampusId.SGW,
            label = "SGW",
            name = "Sir George Williams",
            centerLon = -73.5788,
            centerLat = 45.4972,
            zoom = 16.2
        )
        `when`(campusJpaRepository.findById(CampusId.SGW)).thenReturn(Optional.of(campusEntity))

        val result = repository.findCampus(CampusId.SGW)

        requireNotNull(result)
        assertEquals(CampusId.SGW, result.id)
        assertEquals("SGW", result.label)
        assertEquals("Sir George Williams", result.name)
        assertEquals(-73.5788, result.center.lon)
        assertEquals(45.4972, result.center.lat)
        assertEquals(16.2, result.zoom)
    }

    @Test
    fun `findCampus returns null when entity not found`() {
        `when`(campusJpaRepository.findById(CampusId.LOY)).thenReturn(Optional.empty())

        val result = repository.findCampus(CampusId.LOY)

        assertNull(result)
    }

    @Test
    fun `findBuildingsByCampus uses findAllByCampusId and maps entities`() {
        val campus = CampusEntity(
            id = CampusId.SGW,
            label = "SGW",
            name = "Sir George Williams",
            centerLon = -73.5788,
            centerLat = 45.4972,
            zoom = 16.2
        )
        val buildingEntity = BuildingEntity(
            code = "H",
            campus = campus,
            name = "Henry F. Hall Building",
            location = mapOf("type" to "Point"),
            addresses = mutableListOf("1455 De Maisonneuve Blvd. W."),
            centerLon = -73.5788,
            centerLat = 45.4970
        )
        `when`(buildingJpaRepository.findAllByCampusId(CampusId.SGW)).thenReturn(listOf(buildingEntity))

        val result = repository.findBuildingsByCampus(CampusId.SGW)

        verify(buildingJpaRepository).findAllByCampusId(CampusId.SGW)
        assertEquals(1, result.size)
        assertEquals(CampusId.SGW, result[0].campus)
        assertEquals("H", result[0].code)
        assertEquals("Henry F. Hall Building", result[0].name)
        assertEquals(listOf("1455 De Maisonneuve Blvd. W."), result[0].addresses)
        assertEquals(-73.5788, result[0].center.lon)
        assertEquals(45.4970, result[0].center.lat)
    }
}
