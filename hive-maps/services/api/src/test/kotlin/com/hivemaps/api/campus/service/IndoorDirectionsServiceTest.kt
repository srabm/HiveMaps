package com.hivemaps.api.campus.service

import com.hivemaps.api.campus.domain.*
import com.hivemaps.api.campus.repository.IndoorDirectionsRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.Mockito.*

class IndoorDirectionsServiceTest {

    private lateinit var repository: IndoorDirectionsRepository
    private lateinit var service: IndoorDirectionsService

    private fun node(
        id: String,
        lat: Double = 0.0,
        lon: Double = 0.0,
        floor: String = "1",
        building: String = "B1",
        label: String = "Junction",
        wheelchairAccessible: Boolean = true,
        isVirtual: Boolean = false
    ) = IndoorNode(
        id = id,
        label = label,
        wheelchairAccessible = wheelchairAccessible,
        floor = floor,
        building = building,
        longitude = lon,
        latitude = lat,
        outgoingEdges = mutableListOf(),
        isVirtual = isVirtual
    )

    private fun edge(
        startNode: IndoorNode,
        endNode: IndoorNode,
        distance: Double = 1.0,
        wheelchairAccessible: Boolean = true
    ): IndoorEdge {
        val e = IndoorEdge(
            id = "${startNode.id}->${endNode.id}",
            label = "Edge",
            wheelchairAccessible = wheelchairAccessible,
            startNode = startNode,
            endNode = endNode,
            building = startNode.building,
            distance = distance
        )
        startNode.outgoingEdges.add(e)
        return e
    }

    @BeforeEach
    fun setup() {
        repository = mock(IndoorDirectionsRepository::class.java)
        service = IndoorDirectionsService(repository)
    }

    @Test
    fun `getDirections throws NodeNotFoundException when start node is missing`() {
        `when`(repository.findIndoorNodesByBuilding("B1")).thenReturn(emptyMap())

        assertThrows<NodeNotFoundException> {
            service.getDirections("B1", "start", "end")
        }
    }

    @Test
    fun `getDirections throws NodeNotFoundException when end node is missing`() {
        val n1 = node("start")
        `when`(repository.findIndoorNodesByBuilding("B1")).thenReturn(mapOf("start" to n1))

        assertThrows<NodeNotFoundException> {
            service.getDirections("B1", "start", "end")
        }
    }

    @Test
    fun `getDirections throws NoRouteFoundException when no path exists`() {
        val n1 = node("A")
        val n2 = node("B") // disconnected
        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to n1, "B" to n2))

        assertThrows<NoRouteFoundException> {
            service.getDirections("B1", "A", "B")
        }
    }

    @Test
    fun `getDirections returns directions for a simple straight path`() {
        // A --5m--> B --5m--> C (same floor, going east)
        val a = node("A", lat = 0.0, lon = 0.0)
        val b = node("B", lat = 0.0, lon = 1.0)
        val c = node("C", lat = 0.0, lon = 2.0)
        edge(a, b, distance = 5.0)
        edge(b, c, distance = 5.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b, "C" to c))

        val directions = service.getDirections("B1", "A", "C")

        assertFalse(directions.isEmpty())
        assertTrue(directions.all { it.direction == DirectionType.STRAIGHT })
    }

    @Test
    fun `getDirections includes a turn when path bends`() {
        // A --east--> B --north--> C (90-degree turn at B)
        val a = node("A", lat = 0.0, lon = 0.0)
        val b = node("B", lat = 0.0, lon = 1.0)
        val c = node("C", lat = 1.0, lon = 1.0)
        edge(a, b, distance = 5.0)
        edge(b, c, distance = 5.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b, "C" to c))

        val directions = service.getDirections("B1", "A", "C")
        val types = directions.map { it.direction }

        assertTrue(
            types.contains(DirectionType.LEFT) || types.contains(DirectionType.RIGHT),
            "Expected a turn direction but got: $types"
        )
    }

    @Test
    fun `getDirections includes UP_OR_DOWN when floors change`() {
        val a = node("A", floor = "1")
        val b = node("B", floor = "2")
        edge(a, b, distance = 1.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b))

        val directions = service.getDirections("B1", "A", "B")
        assertTrue(directions.any { it.direction == DirectionType.UP_OR_DOWN })
    }

    @Test
    fun `getDirections throws NoRouteFoundException when start node is not wheelchair accessible`() {
        val a = node("A", wheelchairAccessible = false)
        val b = node("B")
        edge(a, b)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b))

        assertThrows<NoRouteFoundException> {
            service.getDirections("B1", "A", "B", accessibleOnly = true)
        }
    }

    @Test
    fun `getDirections throws NoRouteFoundException when end node is not wheelchair accessible`() {
        val a = node("A")
        val b = node("B", wheelchairAccessible = false)
        edge(a, b)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b))

        assertThrows<NoRouteFoundException> {
            service.getDirections("B1", "A", "B", accessibleOnly = true)
        }
    }

    @Test
    fun `getDirections avoids inaccessible edges when accessibleOnly is true`() {
        // Direct edge is inaccessible; detour via C should be used
        val a = node("A", lon = 0.0, lat = 0.0)
        val b = node("B", lon = 2.0, lat = 0.0)
        val c = node("C", lon = 1.0, lat = 0.0)
        edge(a, b, distance = 2.0, wheelchairAccessible = false)
        edge(a, c, distance = 1.0, wheelchairAccessible = true)
        edge(c, b, distance = 1.0, wheelchairAccessible = true)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b, "C" to c))

        val directions = service.getDirections("B1", "A", "B", accessibleOnly = true)

        assertFalse(directions.isEmpty())

        directions.forEach { dir ->
            var prev: IndoorNode? = null

            dir.nodes.forEach { curr ->
                if (prev == null) {
                    prev = curr
                    return@forEach
                }

                assertTrue(prev != a || curr != b)
                prev = curr
            } 
        }
    }

    @Test
    fun `getDirections uses inaccessible shortcut when accessibleOnly is false`() {
        val a = node("A", lon = 0.0, lat = 0.0)
        val b = node("B", lon = 2.0, lat = 0.0)
        val c = node("C", lon = 1.0, lat = 0.0)
        edge(a, b, distance = 1.0, wheelchairAccessible = false) // shorter, inaccessible
        edge(a, c, distance = 5.0, wheelchairAccessible = true)
        edge(c, b, distance = 5.0, wheelchairAccessible = true)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "B" to b, "C" to c))

        val directions = service.getDirections("B1", "A", "B", accessibleOnly = false)
        var edgeUsed = false
    
        directions.forEach { dir ->
            var prev: IndoorNode? = null

            dir.nodes.forEach { curr ->
                if (prev == null) {
                    prev = curr
                    return@forEach
                }

                if (prev == a && curr == b) {
                    edgeUsed = true
                }

                prev = curr
            } 
        }

        assertFalse(directions.isEmpty())
        assertTrue(edgeUsed)
    }

    @Test
    fun `getDirections does not use virtual nodes as intermediary nodes`() {
        val a = node("A", lon = 0.0, lat = 0.0)
        val v = node("V", lon = 1.0, lat = 0.0, isVirtual = true)
        val b = node("B", lon = 2.0, lat = 0.0)
        edge(a, v, distance = 1.0)
        edge(v, b, distance = 1.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "V" to v, "B" to b))
        
        assertThrows<NoRouteFoundException> {
            service.getDirections("B1", "A", "B")
        }
    }

    @Test
    fun `getDirections does not include start virtual node`() {
        val a = node("A", lon = 0.0, lat = 0.0)
        val v = node("V", lon = 1.0, lat = 0.0, isVirtual = true)
        val b = node("B", lon = 2.0, lat = 0.0)
        edge(v, a, distance = 1.0)
        edge(a, b, distance = 1.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "V" to v, "B" to b))
        
        val directions = service.getDirections("B1", "V", "B")
        assertFalse(directions.isEmpty())

        directions.forEach { dir -> 
            dir.nodes.forEach { curr ->
                assertTrue(curr != v, "Virtual start node V should not appear in directions")
            }
        }
    }

    @Test
    fun `getDirections does not include end virtual node`() {
        val a = node("A", lon = 0.0, lat = 0.0)
        val v = node("V", lon = 1.0, lat = 0.0, isVirtual = true)
        val b = node("B", lon = 2.0, lat = 0.0)
        edge(a, b, distance = 1.0)
        edge(b, v, distance = 1.0)

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("A" to a, "V" to v, "B" to b))
        
        val directions = service.getDirections("B1", "A", "V")
        assertFalse(directions.isEmpty())

        directions.forEach { dir -> 
            dir.nodes.forEach { curr ->
                assertTrue(curr != v, "Virtual end node V should not appear in directions")
            }
        }
    }

    @Test
    fun `getRooms returns only Room-labelled nodes`() {
        val room = node("R1", label = "Room")
        val junction = node("J1", label = "Junction")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("R1" to room, "J1" to junction))

        val rooms = service.getRooms("B1", null)

        assertEquals(1, rooms.size)
        assertEquals("R1", rooms.first().id)
    }

    @Test
    fun `getRooms filters by floor when floor is provided`() {
        val r1 = node("R1", label = "Room", floor = "1")
        val r2 = node("R2", label = "Room", floor = "2")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("R1" to r1, "R2" to r2))

        val rooms = service.getRooms("B1", "1")

        assertEquals(1, rooms.size)
        assertEquals("R1", rooms.first().id)
    }

    @Test
    fun `getRooms returns all rooms when floor is null`() {
        val r1 = node("R1", label = "Room", floor = "1")
        val r2 = node("R2", label = "Room", floor = "2")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("R1" to r1, "R2" to r2))

        assertEquals(2, service.getRooms("B1", null).size)
    }

    @Test
    fun `getRooms returns empty list when building has no nodes`() {
        `when`(repository.findIndoorNodesByBuilding("B1")).thenReturn(emptyMap())
        assertTrue(service.getRooms("B1", null).isEmpty())
    }

    @Test
    fun `getNearestNode returns the closest node on the correct floor`() {
        val near = node("near", lat = 45.4215, lon = -75.6972, floor = "1")
        val far  = node("far",  lat = 45.4215, lon = -75.6969, floor = "1")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("near" to near, "far" to far))

        val result = service.getNearestNode("B1", "1", -75.6973, 45.4215)

        assertEquals("near", result.id)
    }

    @Test
    fun `getNearestNode ignores nodes on a different floor`() {
        val wrongFloor = node("wrong", lat = 45.4215, lon = -75.6972, floor = "2")
        val sameFloor  = node("right", lat = 45.4215, lon = -75.6971, floor = "1")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("wrong" to wrongFloor, "right" to sameFloor))

        val result = service.getNearestNode("B1", "1", -75.6972, 45.4215)

        assertEquals("right", result.id)
    }

    @Test
    fun `getNearestNode throws NodeNotFoundException when all nodes are too far away`() {
        val far = node("far", lat = 100.0, lon = 100.0, floor = "1")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("far" to far))

        assertThrows<NodeNotFoundException> {
            service.getNearestNode("B1", "1", longitude = 0.0, latitude = 0.0)
        }
    }

    @Test
    fun `getNearestNode throws NodeNotFoundException when no nodes exist`() {
        `when`(repository.findIndoorNodesByBuilding("B1")).thenReturn(emptyMap())

        assertThrows<NodeNotFoundException> {
            service.getNearestNode("B1", "1", longitude = 0.0, latitude = 0.0)
        }
    }

    @Test
    fun `getNearestNode throws NodeNotFoundException when no nodes on requested floor`() {
        val n = node("n", lat = 0.0, lon = 0.0, floor = "2")

        `when`(repository.findIndoorNodesByBuilding("B1"))
            .thenReturn(mapOf("n" to n))

        assertThrows<NodeNotFoundException> {
            service.getNearestNode("B1", "1", longitude = 0.0, latitude = 0.0)
        }
    }
}