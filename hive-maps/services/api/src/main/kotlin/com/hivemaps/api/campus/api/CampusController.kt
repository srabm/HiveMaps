package com.hivemaps.api.campus.api

import com.hivemaps.api.campus.domain.CampusId
import com.hivemaps.api.campus.service.CampusService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/campuses")
class CampusController(
    private val campusService: CampusService
) {

    @GetMapping
    fun listCampuses() = campusService.getCampuses()

    @GetMapping("/{id}")
    fun getCampus(@PathVariable id: CampusId): ResponseEntity<Any> =
        campusService.getCampus(id)?.let { ResponseEntity.ok(it) } ?: ResponseEntity.notFound().build()

    @GetMapping("/{id}/buildings")
    fun getBuildings(@PathVariable id: CampusId): ResponseEntity<Any> =
        campusService.getCampus(id)?.let {
            ResponseEntity.ok(campusService.getBuildings(id))
        } ?: ResponseEntity.notFound().build()
}
