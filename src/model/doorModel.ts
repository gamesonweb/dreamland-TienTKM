import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WallModel } from "./wallModel";
import { Color3 } from "@babylonjs/core";
import { RoomModel } from "./roomModel";

export class DoorModel {

    public readonly name: string;
    public readonly size: Vector3;
    public readonly position: Vector3;
    public readonly color: Color3 = new Color3(1, 1, 1);
    private readonly isHorizontal: boolean;
    public readonly connectedRoom: RoomModel;

    public static readonly NORTH = 0;
    public static readonly SOUTH = 1;
    public static readonly EAST = 2;
    public static readonly WEST = 3;
    public static readonly DOOR_WIDTH = 4;
    public static readonly DOOR_DEPTH = 2;

    constructor(room: RoomModel, direction: 0 | 1 | 2 | 3, color: Color3, connectedRoom: RoomModel) {
        this.isHorizontal = direction == DoorModel.NORTH || direction == DoorModel.SOUTH;
        this.size = this.isHorizontal ? new Vector3(DoorModel.DOOR_WIDTH, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS) : new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, DoorModel.DOOR_WIDTH);
        const protrusionOffset = 0.1; // Protrusion into the room
        switch (direction) {
            case DoorModel.NORTH:
                this.name = `${room.name}_north_door`;
                this.position = new Vector3(
                    0, 
                    WallModel.WALL_HEIGHT / 2,
                    -room.size.z / 2 + WallModel.WALL_THICKNESS / 2 + protrusionOffset
                );
                break;
            case DoorModel.SOUTH:
                this.name = `${room.name}_south_door`;
                this.position = new Vector3(
                    0,
                    WallModel.WALL_HEIGHT / 2,
                    room.size.z / 2 - WallModel.WALL_THICKNESS / 2 - protrusionOffset
                );
                break;
            case DoorModel.EAST:
                this.name = `${room.name}_east_door`;
                this.position = new Vector3(
                    room.size.x / 2 - WallModel.WALL_THICKNESS / 2 - protrusionOffset,
                    WallModel.WALL_HEIGHT / 2,
                    0 
                );
                break;
            case DoorModel.WEST:
                this.name = `${room.name}_west_door`;
                this.position = new Vector3(
                    -room.size.x / 2 + WallModel.WALL_THICKNESS / 2 + protrusionOffset,
                    WallModel.WALL_HEIGHT / 2,
                    0
                );
                break;
            default:
                throw new Error(`Invalid direction: ${direction}`);
        }
        this.color = color;
        this.connectedRoom = connectedRoom;
    }
}