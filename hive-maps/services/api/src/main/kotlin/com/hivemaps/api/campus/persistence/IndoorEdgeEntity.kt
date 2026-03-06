package com.hivemaps.api.campus.persistence

import jakarta.persistence.*

@Entity
@Table(name = "indoor_edge")
class IndoorEdgeEntity(
    @Id
    @Column(length = 16)
    var id: String,

    @Column(length = 16, nullable = false)
    var label: String,

    @Column(name = "wheelchair_accessible", nullable = false)
    var wheelchairAccessible: Boolean,

    @ManyToOne
    @JoinColumn(name = "start_node_id", nullable = false)
    var startNode: IndoorNodeEntity,

    @ManyToOne
    @JoinColumn(name = "end_node_id", nullable = false)
    var endNode: IndoorNodeEntity,

    @Column(nullable = false)
    var building: String,

    @Column(nullable = false)
    var distance: Double
) {
    constructor() : this("ID", "LABEL", true, IndoorNodeEntity(), IndoorNodeEntity(), "", 0.0)
}
