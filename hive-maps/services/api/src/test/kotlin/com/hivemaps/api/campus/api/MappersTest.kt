package com.hivemaps.api.campus.api

import com.hivemaps.api.campus.domain.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class IndoorDirectionsMappersTest {

    private fun node(
        id: String = "N1",
        label: String = "Room",
        wheelchairAccessible: Boolean = true,
        floor: String = "1",
        building: String = "H",
        longitude: Double = -75.6972,
        latitude: Double = 45.4215
    ) = IndoorNode(
        id = id,
        label = label,
        wheelchairAccessible = wheelchairAccessible,
        floor = floor,
        building = building,
        longitude = longitude,
        latitude = latitude,
        outgoingEdges = mutableListOf(),
        isVirtual = false
    )

    @Test
    fun `IndoorNode toResponse maps all fields correctly`() {
        val node = node(
            id = "N1",
            label = "Room",
            wheelchairAccessible = true,
            floor = "2",
            building = "H",
            longitude = -75.6972,
            latitude = 45.4215
        )

        val response = node.toResponse()

        assertEquals("N1", response.id)
        assertEquals("Room", response.label)
        assertEquals(true, response.wheelchairAccessible)
        assertEquals("2", response.floor)
        assertEquals("H", response.building)
        assertEquals(-75.6972, response.longitude)
        assertEquals(45.4215, response.latitude)
    }

    @Test
    fun `DirectionType LEFT maps to DirectionTypeResponse LEFT`() {
        assertEquals(DirectionTypeResponse.LEFT, DirectionType.LEFT.toResponse())
    }

    @Test
    fun `DirectionType RIGHT maps to DirectionTypeResponse RIGHT`() {
        assertEquals(DirectionTypeResponse.RIGHT, DirectionType.RIGHT.toResponse())
    }

    @Test
    fun `DirectionType STRAIGHT maps to DirectionTypeResponse STRAIGHT`() {
        assertEquals(DirectionTypeResponse.STRAIGHT, DirectionType.STRAIGHT.toResponse())
    }

    @Test
    fun `DirectionType BACK maps to DirectionTypeResponse BACK`() {
        assertEquals(DirectionTypeResponse.BACK, DirectionType.BACK.toResponse())
    }

    @Test
    fun `DirectionType UP_OR_DOWN maps to DirectionTypeResponse UP_OR_DOWN`() {
        assertEquals(DirectionTypeResponse.UP_OR_DOWN, DirectionType.UP_OR_DOWN.toResponse())
    }

    @Test
    fun `Direction toResponse maps all fields correctly`() {
        val node = node()
        val direction = Direction(
            direction = DirectionType.LEFT,
            distance = 5.0,
            description = "Turn left",
            nodes = mutableListOf(node)
        )

        val response = direction.toResponse()

        assertEquals(DirectionTypeResponse.LEFT, response.direction)
        assertEquals(5.0, response.distance)
        assertEquals("Turn left", response.description)
        assertEquals(1, response.nodes.size)
        assertEquals("N1", response.nodes.first().id)
    }

    @Test
    fun `Direction toResponse maps empty node list correctly`() {
        val direction = Direction(
            direction = DirectionType.STRAIGHT,
            distance = 0.0,
            description = "Go straight",
            nodes = mutableListOf()
        )

        val response = direction.toResponse()

        assertTrue(response.nodes.isEmpty())
    }

    @Test
    fun `Direction toResponse maps multiple nodes correctly`() {
        val direction = Direction(
            direction = DirectionType.STRAIGHT,
            distance = 10.0,
            description = "Go straight 10.00m",
            nodes = mutableListOf(node("N1"), node("N2"), node("N3"))
        )

        val response = direction.toResponse()

        assertEquals(3, response.nodes.size)
        assertEquals("N1", response.nodes[0].id)
        assertEquals("N2", response.nodes[1].id)
        assertEquals("N3", response.nodes[2].id)
    }
}