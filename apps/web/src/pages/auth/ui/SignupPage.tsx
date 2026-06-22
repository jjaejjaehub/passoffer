"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Icon,
} from "@chakra-ui/react";
import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import { authApi, setToken } from "@/entities/auth";
import { appToaster } from "@/shared/ui/app-toaster";

interface SignupFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function SignupPage(): React.JSX.Element {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>();

  const passwordValue = watch("password");

  const onSubmit = async (data: SignupFormValues): Promise<void> => {
    try {
      const res = await authApi.signup({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setToken(res.token);
      appToaster.create({
        type: "success",
        title: "회원가입 완료!",
        description: "PassOffer에 오신 것을 환영합니다.",
      });
      router.push("/dashboard");
    } catch (err) {
      const msg = isAxiosError(err)
        ? (err.response?.data?.message ?? "회원가입 중 오류가 발생했습니다.")
        : "회원가입 중 오류가 발생했습니다.";
      appToaster.create({
        type: "error",
        title: "회원가입 실패",
        description: msg,
      });
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="gray.50"
      px={4}
      py={8}
    >
      <Box w="full" maxW="420px">
        {/* 로고 */}
        <Flex align="center" justify="center" gap={2.5} mb={8}>
          <Flex
            w={10}
            h={10}
            bg="blue.500"
            borderRadius="xl"
            align="center"
            justify="center"
            flexShrink={0}
          >
            <Icon as={ShoppingBag} color="white" boxSize={5} />
          </Flex>
          <Box>
            <Text fontSize="lg" fontWeight="bold" lineHeight="1.2">
              PassOffer
            </Text>
            <Text fontSize="xs" color="gray.400" lineHeight="1.2">
              Order Management Studio
            </Text>
          </Box>
        </Flex>

        <Box
          bg="white"
          borderRadius="2xl"
          boxShadow="0 4px 24px rgba(0,0,0,0.08)"
          borderWidth="1px"
          borderColor="gray.100"
          p={8}
        >
          <Stack gap={6}>
            <Stack gap={1}>
              <Heading size="md" fontWeight="bold">
                회원가입
              </Heading>
              <Text color="gray.500" fontSize="sm">
                새 계정을 만들어 시작하세요
              </Text>
            </Stack>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap={4}>
                {/* 이름 */}
                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    이름
                  </Text>
                  <Input
                    {...register("name", { required: "이름을 입력해주세요" })}
                    placeholder="홍길동"
                    size="md"
                    borderColor={errors.name ? "red.300" : "gray.200"}
                  />
                  {errors.name && (
                    <Text color="red.500" fontSize="xs">
                      {errors.name.message}
                    </Text>
                  )}
                </Stack>

                {/* 이메일 */}
                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    이메일
                  </Text>
                  <Input
                    {...register("email", {
                      required: "이메일을 입력해주세요",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "올바른 이메일을 입력해주세요",
                      },
                    })}
                    placeholder="name@company.com"
                    type="email"
                    size="md"
                    borderColor={errors.email ? "red.300" : "gray.200"}
                  />
                  {errors.email && (
                    <Text color="red.500" fontSize="xs">
                      {errors.email.message}
                    </Text>
                  )}
                </Stack>

                {/* 비밀번호 */}
                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    비밀번호
                  </Text>
                  <Box position="relative">
                    <Input
                      {...register("password", {
                        required: "비밀번호를 입력해주세요",
                        minLength: {
                          value: 8,
                          message: "비밀번호는 8자 이상이어야 합니다",
                        },
                      })}
                      placeholder="8자 이상 입력"
                      type={showPassword ? "text" : "password"}
                      size="md"
                      pr={10}
                      borderColor={errors.password ? "red.300" : "gray.200"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        lineHeight: 0,
                        color: "inherit",
                      }}
                    >
                      <Icon
                        as={showPassword ? EyeOff : Eye}
                        boxSize={4}
                        color="gray.400"
                      />
                    </button>
                  </Box>
                  {errors.password && (
                    <Text color="red.500" fontSize="xs">
                      {errors.password.message}
                    </Text>
                  )}
                </Stack>

                {/* 비밀번호 확인 */}
                <Stack gap={1.5}>
                  <Text fontSize="sm" fontWeight="medium" color="gray.700">
                    비밀번호 확인
                  </Text>
                  <Box position="relative">
                    <Input
                      {...register("confirmPassword", {
                        required: "비밀번호 확인을 입력해주세요",
                        validate: (v) =>
                          v === passwordValue || "비밀번호가 일치하지 않습니다",
                      })}
                      placeholder="비밀번호 재입력"
                      type={showConfirm ? "text" : "password"}
                      size="md"
                      pr={10}
                      borderColor={
                        errors.confirmPassword ? "red.300" : "gray.200"
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        lineHeight: 0,
                        color: "inherit",
                      }}
                    >
                      <Icon
                        as={showConfirm ? EyeOff : Eye}
                        boxSize={4}
                        color="gray.400"
                      />
                    </button>
                  </Box>
                  {errors.confirmPassword && (
                    <Text color="red.500" fontSize="xs">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </Stack>

                <Button
                  type="submit"
                  colorPalette="blue"
                  loading={isSubmitting}
                  loadingText="가입 중..."
                  w="full"
                  mt={1}
                  size="md"
                  fontWeight="semibold"
                >
                  회원가입
                </Button>
              </Stack>
            </form>

            <Flex align="center" gap={3}>
              <Box flex="1" h="1px" bg="gray.100" />
              <Text fontSize="xs" color="gray.400">
                또는
              </Text>
              <Box flex="1" h="1px" bg="gray.100" />
            </Flex>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              이미 계정이 있으신가요?{" "}
              <Text
                as="span"
                color="blue.500"
                fontWeight="medium"
                _hover={{ textDecoration: "underline" }}
              >
                <Link href="/login">로그인</Link>
              </Text>
            </Text>
          </Stack>
        </Box>
      </Box>
    </Flex>
  );
}
