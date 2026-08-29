using System.Security.Claims;
using CvAnalyzer.Api.Controllers;
using CvAnalyzer.Api.Models.Dtos;
using CvAnalyzer.Api.Tests.TestHelpers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CvAnalyzer.Api.Tests.Controllers;

public class ContactControllerTests
{
    private static (ContactController Controller, FakeContactService Service) CreateController(bool authenticated = false, Guid? userId = null)
    {
        var service = new FakeContactService();
        var controller = new ContactController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = authenticated
                        ? TestPrincipal.ForUser(userId ?? Guid.NewGuid())
                        : new ClaimsPrincipal(new ClaimsIdentity()),
                },
            },
        };
        return (controller, service);
    }

    [Fact]
    public async Task Submit_ValidMessage_ReturnsOkAndPersists()
    {
        var (controller, service) = CreateController();

        var response = await controller.Submit(new ContactRequestDto("Ada Lovelace", "ada@example.com", "Soru", "Merhaba"), CancellationToken.None);

        Assert.IsType<OkObjectResult>(response);
        Assert.Equal(1, service.SubmitCallCount);
    }

    [Fact]
    public async Task Submit_AuthenticatedCaller_AttributesMessageToThem()
    {
        var userId = Guid.NewGuid();
        var (controller, service) = CreateController(authenticated: true, userId: userId);

        await controller.Submit(new ContactRequestDto("Ada Lovelace", "ada@example.com", "Soru", "Merhaba"), CancellationToken.None);

        Assert.Equal(userId, service.LastUserId);
    }

    [Fact]
    public async Task Submit_AnonymousCaller_NeverAttributesAUserId()
    {
        var (controller, service) = CreateController();

        await controller.Submit(new ContactRequestDto("Ada Lovelace", "ada@example.com", "Soru", "Merhaba"), CancellationToken.None);

        Assert.Null(service.LastUserId);
    }

    [Theory]
    [InlineData("", "ada@example.com", "Soru", "Mesaj")]
    [InlineData("Ada", "", "Soru", "Mesaj")]
    [InlineData("Ada", "ada@example.com", "", "Mesaj")]
    [InlineData("Ada", "ada@example.com", "Soru", "")]
    public async Task Submit_MissingRequiredField_ReturnsBadRequestWithoutCallingService(string name, string email, string subject, string message)
    {
        var (controller, service) = CreateController();

        var response = await controller.Submit(new ContactRequestDto(name, email, subject, message), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_REQUEST", error.Code);
        Assert.Equal(0, service.SubmitCallCount);
    }

    [Fact]
    public async Task Submit_InvalidEmailFormat_ReturnsBadRequest()
    {
        var (controller, service) = CreateController();

        var response = await controller.Submit(new ContactRequestDto("Ada", "not-an-email", "Soru", "Mesaj"), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_REQUEST", error.Code);
        Assert.Equal(0, service.SubmitCallCount);
    }

    [Fact]
    public async Task Submit_MessageOverLengthLimit_ReturnsBadRequest()
    {
        var (controller, service) = CreateController();
        var tooLong = new string('a', 4001);

        var response = await controller.Submit(new ContactRequestDto("Ada", "ada@example.com", "Soru", tooLong), CancellationToken.None);

        var badRequest = Assert.IsType<BadRequestObjectResult>(response);
        var error = Assert.IsType<ErrorResponseDto>(badRequest.Value);
        Assert.Equal("INVALID_REQUEST", error.Code);
        Assert.Equal(0, service.SubmitCallCount);
    }
}
