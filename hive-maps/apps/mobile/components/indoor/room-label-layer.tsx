import type * as GeoJSON from 'geojson'
import { MapboxGL } from '@/services/mapbox'

export type RoomLabelLayerProps = {
  rooms?: GeoJSON.FeatureCollection | null
  selectedRoomId?: string | null
}

export function RoomLabelLayer({ rooms, selectedRoomId }: RoomLabelLayerProps) {
  if (!rooms) return null

  return (
    <>
      <MapboxGL.ShapeSource id="indoor-room-labels-source" shape={rooms} testID="indoor-room-labels-source">
        <MapboxGL.SymbolLayer
          id="indoor-room-labels"
          style={{
            textField: ['coalesce', ['get', 'label'], ['get', 'name'], ['get', 'code'], ['to-string', ['id']]],
            textSize: 11,
            textColor: '#111827',
            textHaloColor: '#ffffff',
            textHaloWidth: 1,
            textAllowOverlap: true,
          }}
        />
      </MapboxGL.ShapeSource>

      {selectedRoomId ? (
        <MapboxGL.ShapeSource id="indoor-room-selected-label-source" shape={rooms}>
          <MapboxGL.SymbolLayer
            id="indoor-room-selected-label"
            filter={['==', ['coalesce', ['get', 'roomId'], ['get', 'room_id'], ['get', 'id'], ['id']], selectedRoomId]}
            style={{
              textField: ['coalesce', ['get', 'label'], ['get', 'name'], ['get', 'code'], ['to-string', ['id']]],
              textSize: 13,
              textColor: '#9a3412',
              textHaloColor: '#ffffff',
              textHaloWidth: 1.2,
              textAllowOverlap: true,
            }}
          />
        </MapboxGL.ShapeSource>
      ) : null}
    </>
  )
}
