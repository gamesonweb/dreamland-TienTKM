import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DoorModel } from "./doorModel";
import { FloorModel } from "./floorModel";
import { RoofModel } from "./roofModel";
import { WallModel } from "./wallModel";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export class RoomModel{

    public readonly name: string;
    public readonly walls: WallModel[] = [];
    public readonly floor: FloorModel;
    public readonly roof: RoofModel;
    public readonly size: Vector3;
    public readonly doors: { [direction: number]: DoorModel | null } = {
        0: null,
        1: null,
        2: null,
        3: null,
    };
    public readonly position: Vector3;
    public readonly type: "is_normal" | "is_boss";
    private completed: boolean = false;
    public static readonly MAX_DOORS = 4;
    public static readonly IS_NORMAL = "is_normal";
    public static readonly IS_BOSS = "is_boss";
    public _itemGiven: boolean = false;


    constructor(name: string, size: Vector3, position: Vector3, type: "is_normal" | "is_boss") {
        this.name = name;
        this.size = size;
        this.position = position;
        this.type = type;
        this.completed = false;
        const wallColor = new Color3(0.5, 0.5, 0.5);
        this.walls[DoorModel.NORTH] = new WallModel(
           `${this.name}_north_wall`,
            new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS),
            new Vector3(0, WallModel.WALL_HEIGHT / 2, -this.size.z / 2),
            wallColor
        );
        this.walls[DoorModel.SOUTH] = new WallModel(
            `${this.name}_south_wall`,
            new Vector3(this.size.x, WallModel.WALL_HEIGHT, WallModel.WALL_THICKNESS),
            new Vector3(0, WallModel.WALL_HEIGHT / 2, this.size.z / 2),
            wallColor
        );
        this.walls[DoorModel.EAST] = new WallModel(
            `${this.name}_east_wall`,
            new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z),
            new Vector3(this.size.x / 2, WallModel.WALL_HEIGHT / 2, 0),
            wallColor
        );
        this.walls[DoorModel.WEST] = new WallModel(
            `${this.name}_west_wall`,
            new Vector3(WallModel.WALL_THICKNESS, WallModel.WALL_HEIGHT, this.size.z),
            new Vector3(-this.size.x / 2, WallModel.WALL_HEIGHT / 2, 0),
            wallColor
        );
        this.floor = new FloorModel(`${this.name}_floor`,
            this.size,
            new Vector3(0, FloorModel.FLOOR_DEPTH_OFFSET, 0),
            new Color3(0.4, 0.6, 0.4)
        );
        this.roof = new RoofModel(
            `${this.name}_roof`,
            this.size,
            new Vector3(0, WallModel.WALL_HEIGHT - RoofModel.ROOF_HEIGHT_OFFSET, 0),
            new Color3(0.4, 0.4, 0.6)
        );
    }

    public addDoor(direction: 0 | 1 | 2 | 3, connectedRoom: RoomModel) {
        // console.log(`Adding door to ${this.name} in direction ${direction}`);
        this.doors[direction] = new DoorModel(this, direction, new Color3(0, 0, 1), connectedRoom);
    }

    public getDoor(direction: 0 | 1 | 2 | 3): DoorModel | null {
        return this.doors[direction];
    }

    public setToCompleted(): void {
        this.completed = true;
    }

    public isCompleted(): boolean {
        return this.completed;
    }



}