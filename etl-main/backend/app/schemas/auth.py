from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    role: str | None = None
    institution: str | None = None


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)
    role: str = Field(min_length=1)
    institution: str = Field(min_length=1)
    email: str = Field(min_length=1)


class UserProfileResponse(BaseModel):
    username: str
    role: str
    institution: str | None = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfileResponse


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=6)
    role: str = Field(min_length=1)
    institution: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


class UpdateUserRequest(BaseModel):
    role: str | None = None
    institution: str | None = None
    is_active: bool | None = None
