/// Maps the backend's `UserJson` (`GET/PUT /user/{id}`).
///
/// Transient: only used inside [UserService.changePassword]'s
/// GET-then-merge-then-PUT flow, never persisted client-side.
class AppUser {
  final int? id;
  final String? uuid;
  final String? name;
  final String email;
  final String password;
  final bool enabled;
  final bool firstLogin;
  final String role;
  final int? tenantId;

  const AppUser({
    this.id,
    this.uuid,
    this.name,
    required this.email,
    required this.password,
    required this.enabled,
    required this.firstLogin,
    required this.role,
    this.tenantId,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      name: json['name'] as String?,
      email: json['email'] as String,
      password: json['password'] as String? ?? '',
      enabled: json['enabled'] as bool? ?? true,
      firstLogin: json['firstLogin'] as bool? ?? false,
      role: json['role'] as String,
      tenantId: json['tenantId'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'uuid': uuid,
    'name': name,
    'email': email,
    'password': password,
    'enabled': enabled,
    'firstLogin': firstLogin,
    'role': role,
    'tenantId': tenantId,
  };

  AppUser copyWith({String? password, bool? firstLogin}) => AppUser(
    id: id,
    uuid: uuid,
    name: name,
    email: email,
    password: password ?? this.password,
    enabled: enabled,
    firstLogin: firstLogin ?? this.firstLogin,
    role: role,
    tenantId: tenantId,
  );
}
