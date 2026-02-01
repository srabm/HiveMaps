package com.hivemaps.api.campus.persistence

import com.hivemaps.api.campus.domain.CampusId
import jakarta.persistence.*

@Entity
@Table(name = "building")
class BuildingEntity(
    @Id
    @Column(length = 8)
    var code: String,

    @ManyToOne
    @JoinColumn(name = "campus_id", nullable = false)
    var campus: CampusEntity,

    @Column(nullable = false)
    var name: String,

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "building_address", joinColumns = [JoinColumn(name = "building_code")])
    @Column(name = "address")
    var addresses: MutableList<String> = mutableListOf()
) {
    constructor() : this("CODE", CampusEntity(CampusId.SGW, "SGW", "SGW", 0.0, 0.0, 0.0), "Building", mutableListOf())
}
