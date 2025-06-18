import {Controller, Post, Body, Get, Param, Put, HttpStatus, HttpException} from '@nestjs/common';
import {UserService} from './user.service';

interface CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

interface PasswordResetDto {
    email: string;
}

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {
    }

    @Post()
    async createUser(@Body() createUserDto: CreateUserDto) {
        try {
            const user = await this.userService.createUser(createUserDto);
            return {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                },
                message: 'User created successfully. Welcome email will be sent shortly.'
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.BAD_REQUEST
            );
        }
    }

    @Put(':id')
    async updateUser(@Param('id') id: string, @Body() updateUserDto: Partial<CreateUserDto>) {
        try {
            const user = await this.userService.updateUser(parseInt(id), updateUserDto);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: user,
                message: 'User updated successfully'
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get(':id')
    async getUser(@Param('id') id: string) {
        try {
            const user = await this.userService.findById(parseInt(id));
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            return {
                success: true,
                data: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName
                }
            };
        } catch (error) {
            throw new HttpException(
                {success: false, message: error.message},
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
