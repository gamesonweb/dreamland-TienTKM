import { RoomModel } from "../model/roomModel";
import { FloorModel } from "../model/floorModel";
import { RoofModel } from "../model/roofModel";
import { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { Quaternion, SceneLoader, Vector3 } from "@babylonjs/core";

export class RoomView {
    private readonly scene: Scene;
    private readonly room: RoomModel;

    constructor(scene: Scene, room: RoomModel) {
        this.room = room;
        this.scene = scene;
        this._createRoomMesh();
    }

    protected _createRoomMesh(): void {
        this._createWalls();
        this._createFloor();
        this._createRoof();
        this._setDoors();
    }

    protected _createRoof() {
        let roof = this.room.roof;
        const roofMesh = MeshBuilder.CreateBox(
            roof.name,
            {
                width: roof.size.x,
                height: RoofModel.ROOF_THICKNESS,
                depth: roof.size.z,
            },
            this.scene
        );
        roofMesh.position = roof.position;
        const material = new StandardMaterial(`${roof.name}_roofMaterial`, this.scene);
        material.diffuseColor = roof.color;
        roofMesh.material = material;
        new PhysicsAggregate(roofMesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);
        // Set the roof mesh to be invisible
        roofMesh.isVisible = false;
    }

    protected async _createFloor(): Promise<void> {
        let floor = this.room.floor;
        // 1. Create the invisible box mesh for physics
        const floorMesh = MeshBuilder.CreateBox(
            floor.name,
            {
                width: floor.size.x,
                height: FloorModel.FLOOR_THICKNESS,
                depth: floor.size.z,
            },
            this.scene
        );
        floorMesh.position = floor.position;
        const material = new StandardMaterial(`${floor.name}_floorMaterial`, this.scene);
        material.diffuseColor = floor.color;
        floorMesh.material = material;
        floorMesh.metadata = { isGround: true };
        new PhysicsAggregate(floorMesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

        // 2. Load the floor-detail.glb model for visuals
        const result = await SceneLoader.ImportMeshAsync(
            "",                // meshNames: import all meshes
            "models/",         // rootUrl
            "floor-detail.glb",// fileName
            this.scene
        );
        const floorDetailMesh = result.meshes[0];
        floorDetailMesh.name = `${floor.name}_detail`;
        floorDetailMesh.scaling = floor.size.clone().divide(new Vector3(1, 1, 1));
        floorDetailMesh.position = floor.position.clone();
        // Optionally set material color
        const detailMaterial = new StandardMaterial(`${floor.name}_detailMaterial`, this.scene);
        detailMaterial.diffuseColor = floor.color;
        floorDetailMesh.material = detailMaterial;
        floorDetailMesh.metadata = { isGround: true };
    }

    protected async _createWalls(): Promise<void> {
        const walls = this.room.walls;
        for (let wall of walls) {
            // 1. Create the invisible box mesh for physics
            const boxMesh = MeshBuilder.CreateBox(
                `${wall.name}_physics`,
                {
                    width: wall.size.x,
                    height: wall.size.y,
                    depth: wall.size.z,
                },
                this.scene
            );
            boxMesh.position = wall.position.clone();
            boxMesh.isVisible = false;
            boxMesh.metadata = { isObstacle: true };
            new PhysicsAggregate(boxMesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

            // 2. Load the wall.glb model for visuals
            const result = await SceneLoader.ImportMeshAsync(
                "",                // meshNames: import all meshes
                "models/",         // rootUrl
                "wall.glb",        // fileName
                this.scene
            );
            const wallMesh = result.meshes[0];
            wallMesh.name = wall.name;
            wallMesh.scaling = wall.size.clone().divide(new Vector3(1, 1, 1));
            wallMesh.position = wall.position.clone();
            wallMesh.position.y = 0;

            // Set material color
            const material = new StandardMaterial(`${wall.name}_wallMaterial`, this.scene);
            material.diffuseColor = wall.color;
            wallMesh.material = material;
            wallMesh.metadata = { isObstacle: true };
        }
    }

    protected async _setDoors(): Promise<void> {
        let doors = this.room.doors;
        for (let dir = 0; dir < RoomModel.MAX_DOORS; dir++) {
            if (doors[dir] != null) {
                let door = doors[dir];
                // 1. Create the invisible box mesh for physics
                const doorMesh = MeshBuilder.CreateBox(
                    door.name,
                    {
                        width: door.size.x,
                        height: door.size.y,
                        depth: door.size.z,
                    },
                    this.scene
                );
                doorMesh.position = door.position;
                doorMesh.isVisible = false;
                doorMesh.metadata = { isDoor: true, connectedRoom: door.connectedRoom, direction: dir };
                const material = new StandardMaterial(`${door.name}_${dir}_doorMaterial`, this.scene);
                material.diffuseColor = door.color;
                doorMesh.material = material;
                new PhysicsAggregate(doorMesh, PhysicsShapeType.BOX, { mass: 0 }, this.scene);

                // 2. Load the gate.glb model for visuals
                const result = await SceneLoader.ImportMeshAsync(
                    "",
                    "models/",
                    "gate.glb",
                    this.scene
                );
                const gateMesh = result.meshes[0];
                gateMesh.name = `${door.name}_visual`;
                // gateMesh.scaling = door.size.clone().divide(new Vector3(1, 1, 1));
                // The scaling will always be the same, so we can use the same scaling for the gate
                gateMesh.scaling = new Vector3(10, 10, 10);

                gateMesh.position = door.position.clone();
                gateMesh.position.y = 0; // Align with floor

                // Depending on the direction, rotate the gate
                let rotationY = 0;
                switch (dir) {
                    case 0: // NORTH
                        rotationY = 0;
                        break;
                    case 1: // SOUTH
                        rotationY = Math.PI;
                        break;
                    case 2: // EAST
                        rotationY = -Math.PI / 2;
                        break;
                    case 3: // WEST
                        rotationY = Math.PI / 2;
                        break;
                }
                gateMesh.rotationQuaternion = Quaternion.FromEulerAngles(0, rotationY, 0);

                // Stop all animations on the imported gate
                if (result.animationGroups) {
                    result.animationGroups.forEach(group => group.stop());
                }

                // Optionally set material color
                const gateMaterial = new StandardMaterial(`${door.name}_gateMaterial`, this.scene);
                gateMaterial.diffuseColor = door.color;
                gateMesh.material = gateMaterial;
                gateMesh.metadata = { isDoor: true, connectedRoom: door.connectedRoom, direction: dir };
            }
        }
    }

    public _setRoofTransparency(alpha: number): void {
        const roof = this.scene.getMeshByName(`${this.room.name}_roof`);
        if (roof?.material instanceof StandardMaterial) {
            roof.material.alpha = alpha;
        }
    }

    public _setWallsTransparency(alpha: number): void {
        for (const dir of ["north", "south", "east", "west"]) {
            const wall = this.scene.getMeshByName(`${this.room.name}_${dir}_wall`);
            if (wall?.material instanceof StandardMaterial) {
                wall.material.alpha = alpha;
            }
        }
    }

    public update(): void {
        this._createRoomMesh();
    }

    public dispose(): void {
        // Dispose all meshes that belong to this room (physics and visuals)
        for (let i = this.scene.meshes.length - 1; i >= 0; i--) {
            const mesh = this.scene.meshes[i];

            // Check if the mesh corresponds to the room's roof or floor
            const isRoofOrFloor =
                mesh.name === this.room.roof.name ||
                mesh.name === this.room.floor.name;

            // Check if the mesh is a wall (physics or visual)
            const isWall =
                this.room.walls.some(wall =>
                    mesh.name === wall.name || // visual mesh
                    mesh.name === `${wall.name}_physics` // physics mesh
                );

            // Check if the mesh is a door (physics or visual)
            const isDoor =
                Object.values(this.room.doors).some(door =>
                    door &&
                    (mesh.name === door.name ||
                        mesh.name === `${door.name}_visual`)
                );

            // Also dispose of imported visual meshes (e.g., *_detail, *_visual)
            const isImportedVisual =
                mesh.name === `${this.room.floor.name}_detail` ||
                mesh.name.endsWith("_visual") ||
                mesh.name.endsWith("_detail");

            if (isRoofOrFloor || isWall || isDoor || isImportedVisual) {
                mesh.dispose();
            }
        }
    }
}