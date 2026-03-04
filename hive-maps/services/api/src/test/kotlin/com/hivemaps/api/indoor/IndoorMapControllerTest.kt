package com.hivemaps.api.indoor

import org.hamcrest.Matchers.greaterThan
import org.hamcrest.Matchers.hasItems
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.context.WebApplicationContext

@SpringBootTest
class IndoorMapControllerTest(
    @Autowired private val webApplicationContext: WebApplicationContext
) {
    private lateinit var mockMvc: MockMvc

    @BeforeEach
    fun setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build()
    }

    @Test
    fun `floors endpoint returns seeded floor list for valid campus-building pair`() {
        mockMvc.perform(get("/api/campuses/LOY/buildings/CC/floors"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].id").value("1"))
            .andExpect(jsonPath("$[0].label").value("1st Floor"))
            .andExpect(jsonPath("$[0].sortOrder").value(1))
    }

    @Test
    fun `floors endpoint returns expected hall floors from imported geojson seed`() {
        mockMvc.perform(get("/api/campuses/SGW/buildings/H/floors"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[*].id", hasItems("1", "2", "8", "9")))
    }

    @Test
    fun `supported buildings endpoint returns backend indoor source of truth`() {
        mockMvc.perform(get("/api/indoor/buildings"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.length()").value(6))
            .andExpect(jsonPath("$[*].buildingCode", hasItems("CC", "H", "LB", "MB", "VE", "VL")))
            .andExpect(jsonPath("$[?(@.buildingCode == 'CC')].campusId", hasItems("LOY")))
            .andExpect(jsonPath("$[?(@.buildingCode == 'H')].campusId", hasItems("SGW")))
    }

    @Test
    fun `floors endpoint returns 404 for invalid campus-building pair`() {
        mockMvc.perform(get("/api/campuses/SGW/buildings/CC/floors"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `floor details endpoint returns geojson payload for valid floor`() {
        mockMvc.perform(get("/api/campuses/LOY/buildings/CC/floors/1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.buildingCode").value("CC"))
            .andExpect(jsonPath("$.floor.id").value("1"))
            .andExpect(jsonPath("$.floor.label").value("1st Floor"))
            .andExpect(jsonPath("$.planGeometry.type").value("Polygon"))
            .andExpect(jsonPath("$.rooms.type").value("FeatureCollection"))
            .andExpect(jsonPath("$.rooms.features.length()").value(greaterThan(0)))
            .andExpect(jsonPath("$.rooms.features[0].properties.id").exists())
            .andExpect(jsonPath("$.rooms.features[0].properties.label").exists())
            .andExpect(jsonPath("$.rooms.features[0].properties.type").exists())
    }

    @Test
    fun `floor details endpoint returns hall floor with seeded rooms`() {
        mockMvc.perform(get("/api/campuses/SGW/buildings/H/floors/8"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.buildingCode").value("H"))
            .andExpect(jsonPath("$.floor.id").value("8"))
            .andExpect(jsonPath("$.rooms.type").value("FeatureCollection"))
            .andExpect(jsonPath("$.rooms.features.length()").value(greaterThan(0)))
    }

    @Test
    fun `floor details endpoint returns 404 for unknown floor`() {
        mockMvc.perform(get("/api/campuses/LOY/buildings/CC/floors/99"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `floor details endpoint returns 404 for invalid campus-building pair`() {
        mockMvc.perform(get("/api/campuses/SGW/buildings/CC/floors/1"))
            .andExpect(status().isNotFound)
    }
}
