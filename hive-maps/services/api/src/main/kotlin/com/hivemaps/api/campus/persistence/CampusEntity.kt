package com.hivemaps.api.campus.persistence

import com.hivemaps.api.campus.domain.CampusId
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.OneToMany
import jakarta.persistence.Table

@Entity
@Table(name = "campus")
class CampusEntity(
    @Id
    @Enumerated(EnumType.STRING)
    var id: CampusId,

    @Column(nullable = false)
    var label: String,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var centerLon: Double,

    @Column(nullable = false)
    var centerLat: Double,

    @Column(nullable = false)
    var zoom: Double,

    @OneToMany(mappedBy = "campus")
    var buildings: MutableList<BuildingEntity> = mutableListOf()
) {
    constructor() : this(CampusId.SGW, "SGW", "Sir George Williams", 0.0, 0.0, 0.0)
}
