package com.hivemaps.api.campus.persistence

import jakarta.persistence.*

@Entity
@Table(name = "indoor_node")
class IndoorNodeEntity(
    @Id
    @Column(length = 16)
    var id: String,

    @Column(length = 16, nullable = false)
    var label: String,

    @Column(name = "wheelchair_accessible", nullable = false)
    var wheelchairAccessible: Boolean,

    @Column(nullable = false)
    var floor: String,

    @Column(nullable = false)
    var building: String,

    @Column(nullable = false)
    var lon: Double,

    @Column(nullable = false)
    var lat: Double,

    @Column(name = "is_virtual", nullable = false)
    var isVirtual: Boolean,

    @OneToMany(mappedBy = "startNode")
    var outgoingEdges: MutableList<IndoorEdgeEntity> = mutableListOf()
) {
    constructor() : this("ID", "LABEL", true, "", "", 0.0, 0.0, false)
}
