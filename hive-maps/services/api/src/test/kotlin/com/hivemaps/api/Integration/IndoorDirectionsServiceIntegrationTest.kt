package com.hivemaps.api

import com.hivemaps.api.campus.service.IndoorDirectionsService
import org.junit.jupiter.api.Test
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest


@SpringBootTest
class IndoorDirectionsServiceIntegrationTest {

    @Autowired
    lateinit var indoorDirectionsService: IndoorDirectionsService
        // Testing that a valid route between two nodes is given
    @Test
    fun `returns directions for valid route`() {
        val result = indoorDirectionsService.getDirections("LB", "LB2_J1", "LB2_J4", false)
        assertThat(result).isNotEmpty()

        assertThat(result).hasSize(3)

        val step0 = result[0]
        assertThat(step0.direction.toString()).isEqualTo("STRAIGHT")
        assertThat(step0.distance).isEqualTo(32.863336031513796)
        assertThat(step0.description).isEqualTo("Go straight 32.86m")
        assertThat(step0.nodes).hasSize(3)
        assertThat(step0.nodes[0].id).isEqualTo("LB2_J1")
        assertThat(step0.nodes[1].id).isEqualTo("LB2_J2")
        assertThat(step0.nodes[2].id).isEqualTo("LB2_J3")

        val step1 = result[1]
        assertThat(step1.direction.toString()).isEqualTo("RIGHT")
        assertThat(step1.distance).isEqualTo(0.0)
        assertThat(step1.description).isEqualTo("Turn right")
        assertThat(step1.nodes).hasSize(1)
        assertThat(step1.nodes[0].id).isEqualTo("LB2_J3")

        val step2 = result[2]
        assertThat(step2.direction.toString()).isEqualTo("STRAIGHT")
        assertThat(step2.distance).isEqualTo(13.482287612418306)
        assertThat(step2.nodes).hasSize(3)
        assertThat(step2.nodes[0].id).isEqualTo("LB2_J3")
        assertThat(step2.nodes[2].id).isEqualTo("LB2_J4")
    }

    @Test
    fun `returns directions with accessible=true`() {
        val result = indoorDirectionsService.getDirections("LB", "LB2_J1", "LB2_J4", true)
        assertThat(result).isNotEmpty()
        assertThat(result).hasSize(3)

        val step0 = result[0]
        assertThat(step0.direction.toString()).isEqualTo("STRAIGHT")
        assertThat(step0.distance).isEqualTo(32.863336031513796)
        assertThat(step0.description).isEqualTo("Go straight 32.86m")
        assertThat(step0.nodes).hasSize(3)
        assertThat(step0.nodes[0].id).isEqualTo("LB2_J1")
        assertThat(step0.nodes[1].id).isEqualTo("LB2_J2")
        assertThat(step0.nodes[2].id).isEqualTo("LB2_J3")

        val step1 = result[1]
        assertThat(step1.direction.toString()).isEqualTo("RIGHT")
        assertThat(step1.distance).isEqualTo(0.0)
        assertThat(step1.description).isEqualTo("Turn right")
        assertThat(step1.nodes).hasSize(1)
        assertThat(step1.nodes[0].id).isEqualTo("LB2_J3")

        val step2 = result[2]
        assertThat(step2.direction.toString()).isEqualTo("STRAIGHT")
        assertThat(step2.distance).isEqualTo(13.482287612418306)
        assertThat(step2.nodes).hasSize(3)
        assertThat(step2.nodes[0].id).isEqualTo("LB2_J3")
        assertThat(step2.nodes[2].id).isEqualTo("LB2_J4")
    }

    @Test
    fun `throws exception for unknown building`() {
        assertThatThrownBy {
            indoorDirectionsService.getDirections("null", "LB2_J1", "LB2_J4", false)
        }
    }

    @Test
    fun `throws exception for unknown start node`() {
        assertThatThrownBy {
            indoorDirectionsService.getDirections("LB", "null", "LB2_J4", false)
        }
    }

    @Test
    fun `throws exception for unknown end node`() {
        assertThatThrownBy {
            indoorDirectionsService.getDirections("LB", "LB2_J1", "null", false)
        }
    }


    // Testing to get all rooms
    @Test
    fun `returns directions for valid building`() {
        val result = indoorDirectionsService.getRooms("LB",null)
        assertThat(result).isNotEmpty()
    }

    @Test
    fun `returns nodes with floors=2`() {
        val result = indoorDirectionsService.getRooms("LB", "2")
        assertThat(result).isNotEmpty()
    }


    @Test
    fun `throws exception for unknown building name`() {
        val result =  indoorDirectionsService.getRooms("Library", "2")
        assertThat(result).isEmpty()
    }

    @Test
    fun `throws exception for unknown floor name`() {
        val result =  indoorDirectionsService.getRooms("LB", "200")
        assertThat(result).isEmpty()
    }

    // Testing the nearest node
    @Test
    fun `returns nearest node for valid coordinates`() {
        val result = indoorDirectionsService.getNearestNode("LB", "2", -73.57846498489381, 45.4966434940465)

        assertThat(result.id).isEqualTo("LB2_J1")
        assertThat(result.label).isEqualTo("Junction")
        assertThat(result.wheelchairAccessible).isTrue()
        assertThat(result.floor).isEqualTo("2")
        assertThat(result.building).isEqualTo("LB")
        assertThat(result.longitude).isEqualTo(-73.57846498489381)
        assertThat(result.latitude).isEqualTo(45.4966434940465)
    }

    @Test
    fun `returns nearest node for invalid coordinates`() {
        assertThatThrownBy {indoorDirectionsService.getNearestNode("LB", "2", 0.0, 0.0)}
    }


    @Test
    fun `throws exception for unknown building name v1`() {
        assertThatThrownBy {indoorDirectionsService.getNearestNode("Building", "2",  -73.57846498489381, 45.4966434940465)}
    }

    @Test
    fun `throws exception for unknown floor name v1`() {
        assertThatThrownBy {indoorDirectionsService.getNearestNode("LB", "200",  -73.57846498489381, 45.4966434940465)}
    }


}


